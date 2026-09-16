import os, tempfile, json, time
import pandas as pd
import gspread
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from google.oauth2.service_account import Credentials as SAK_Credentials

router = APIRouter()
PROGRESS = {}

@router.get("/progress/{client_id}")
def get_progress(client_id: str):
    return JSONResponse(PROGRESS.get(client_id, {"progress": 0, "message": "Menunggu..."}))

def get_gns_service_account():
    path = os.path.join(os.path.dirname(__file__), "gns_gcp_account.json")
    return SAK_Credentials.from_service_account_file(path, scopes=["https://www.googleapis.com/auth/spreadsheets"])

class RunFranceskaReq(BaseModel):
    client_id: str
    sheet_url: str = "https://docs.google.com/spreadsheets/d/1wLdsADx0W3IRcA6lGK1kjaSrDci7Z9QqCM7iSU-64TU/"
    pipeline_url: str = "https://gns-data-cleaner-v2.vercel.app/"

def run_pipeline(driver, wait, csv_upload_path, download_dir, label, pipeline_url, cid):
    PROGRESS[cid] = {"progress": PROGRESS[cid]["progress"] + 5, "message": f"[{label}] Membuka GNS Data Cleaner..."}
    driver.get(pipeline_url)

    PROGRESS[cid] = {"progress": PROGRESS[cid]["progress"] + 5, "message": f"[{label}] Memilih mode 'Grab only'..."}
    grab_only_btn = wait.until(EC.element_to_be_clickable((By.XPATH, "//div[contains(text(), 'Grab only')]")))
    grab_only_btn.click()

    PROGRESS[cid] = {"progress": PROGRESS[cid]["progress"] + 5, "message": f"[{label}] Mengunggah CSV kotor ke website..."}
    file_input = wait.until(EC.presence_of_element_located((By.XPATH, "//input[@type='file']")))
    file_input.send_keys(csv_upload_path)

    PROGRESS[cid] = {"progress": PROGRESS[cid]["progress"] + 5, "message": f"[{label}] Menjalankan proses pembersihan..."}
    run_btn_el = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Run Pipeline')]")))
    run_btn_el.click()

    PROGRESS[cid] = {"progress": PROGRESS[cid]["progress"] + 5, "message": f"[{label}] Menunggu file hasil..."}
    download_anchor = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "a.dl-btn[download]")))

    blob_url = download_anchor.get_attribute("href")
    csv_text = driver.execute_script("""
        const url = arguments[0];
        return await fetch(url).then(r => r.text()).catch(e => 'ERROR: ' + e);
    """, blob_url)

    if csv_text.startswith("ERROR"):
        raise Exception(f"[{label}] Gagal fetch blob: {csv_text}")

    clean_csv_path = os.path.join(download_dir, f"gns-{label.lower()}-cleaned.csv")
    with open(clean_csv_path, "w", encoding="utf-8") as f:
        f.write(csv_text)

    return clean_csv_path

@router.post("/run")
def run_franceska_api(req: RunFranceskaReq):
    cid = req.client_id
    try:
        PROGRESS[cid] = {"progress": 5, "message": "Menyiapkan Temporary Folder..."}
        sessions = [
            {"source": "SG2", "target": "SG3", "label": "SG"},
            {"source": "MY2", "target": "MY3", "label": "MY"}
        ]
        
        with tempfile.TemporaryDirectory() as tmp_dir:
            PROGRESS[cid] = {"progress": 10, "message": "Menghubungkan ke Google Sheets API..."}
            gc = gspread.authorize(get_gns_service_account())
            sh = gc.open_by_url(req.sheet_url)

            PROGRESS[cid] = {"progress": 15, "message": "Meluncurkan Chrome Headless (Selenium)..."}
            options = webdriver.ChromeOptions()
            options.add_argument("--headless=new")
            options.add_argument("--no-sandbox")
            options.add_argument("--disable-dev-shm-usage")
            options.add_argument("--disable-gpu")
            prefs = {"download.default_directory": tmp_dir, "download.prompt_for_download": False, "directory_upgrade": True}
            options.add_experimental_option("prefs", prefs)

            driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
            wait = WebDriverWait(driver, 120)

            results_data = {}

            try:
                for idx, sess in enumerate(sessions):
                    label = sess["label"]
                    PROGRESS[cid] = {"progress": 20 + (idx*40), "message": f"[{label}] Mengunduh data dari {sess['source']}..."}
                    
                    sheet_src = sh.worksheet(sess["source"])
                    df_src = pd.DataFrame(sheet_src.get_all_records())
                    csv_upload_path = os.path.join(tmp_dir, f"{label.lower()}_temp.csv")
                    df_src.to_csv(csv_upload_path, index=False)

                    clean_csv_path = run_pipeline(driver, wait, csv_upload_path, tmp_dir, label, req.pipeline_url, cid)

                    PROGRESS[cid] = {"progress": 50 + (idx*40), "message": f"[{label}] Menimpa data bersih ke {sess['target']}..."}
                    df_clean = pd.read_csv(clean_csv_path).fillna("")
                    sheet_tgt = sh.worksheet(sess["target"])
                    sheet_tgt.clear()
                    sheet_tgt.update(values=[df_clean.columns.values.tolist()] + df_clean.values.tolist(), value_input_option="USER_ENTERED")
                    
                    results_data[label] = df_clean.to_dict(orient="records")

            finally:
                driver.quit()

        PROGRESS[cid] = {"progress": 100, "message": "Semua sesi selesai diproses!"}
        return JSONResponse({"status": "success", "data": results_data})

    except Exception as e:
        return JSONResponse({"status": "error", "message": str(e)}, status_code=500)