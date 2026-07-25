import sys
import time
from datetime import datetime

job_id = sys.argv[1] if len(sys.argv) > 1 else "unknown"

print(f"[{datetime.now()}] 任務開始，job_id={job_id}")
time.sleep(3)
print(f"[{datetime.now()}] 任務完成，job_id={job_id}")
