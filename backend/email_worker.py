import os
import base64
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

SCOPES = ['https://www.googleapis.com/auth/gmail.send']

def get_gmail_service():
    creds = None
    DATA_DIR = os.getenv("DATA_DIR", ".")
    token_path = os.path.join(DATA_DIR, 'token.json')
    if os.path.exists(token_path):
        creds = Credentials.from_authorized_user_file(token_path, SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            raise Exception("Gmail token.json not found or invalid. Please run 'python setup_gmail.py' first.")
    return build('gmail', 'v1', credentials=creds)

def send_payslip_email(to_email: str, employee_name: str, month: str, year: int, pdf_bytes: bytes):
    service = get_gmail_service()
    
    msg = MIMEMultipart()
    msg['From'] = 'me'
    msg['To'] = to_email
    msg['Subject'] = f'Your Salary Slip for {month} {year}'
    
    html_content = f"""
    <p>Hello {employee_name},</p>
    <p>Your salary slip for {month} {year} has been generated successfully.</p>
    <p>Please find the attached salary slip PDF.</p>
    <br/>
    <p><strong>SECURITY NOTICE:</strong></p>
    <p>Your salary slip is password protected. The password is the first 4 letters of your name (lowercase, no spaces) followed by the last 4 digits of your Employee ID.</p>
    <p><em>Example: If your name is Rohit Reddy and ID is NT-0001, your password is: <strong>rohi0001</strong></em></p>
    <br/>
    <p>Regards,</p>
    <p>Finance Team</p>
    """
    
    msg.attach(MIMEText(html_content, 'html'))
    
    part = MIMEApplication(pdf_bytes, Name=f"SalarySlip_{month}_{year}.pdf")
    part['Content-Disposition'] = f'attachment; filename="SalarySlip_{month}_{year}.pdf"'
    msg.attach(part)
    
    raw_message = base64.urlsafe_b64encode(msg.as_bytes()).decode('utf-8')
    
    try:
        service.users().messages().send(userId='me', body={'raw': raw_message}).execute()
    except Exception as error:
        raise Exception(f"An error occurred sending via Gmail API: {error}")
