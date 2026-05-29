import os.path
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow

# If modifying these scopes, delete the file token.json.
SCOPES = ['https://www.googleapis.com/auth/gmail.send']

def main():
    creds = None
    DATA_DIR = os.getenv("DATA_DIR", ".")
    os.makedirs(DATA_DIR, exist_ok=True)
    token_path = os.path.join(DATA_DIR, 'token.json')
    
    # The file token.json stores the user's access and refresh tokens
    if os.path.exists(token_path):
        creds = Credentials.from_authorized_user_file(token_path, SCOPES)
    # If there are no (valid) credentials available, let the user log in.
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            # Find the client secret file
            secret_file = None
            for f in os.listdir('.'):
                if f.startswith('client_secret_') and f.endswith('.json'):
                    secret_file = f
                    break
            
            if not secret_file:
                print("Error: Could not find client_secret_*.json file in the backend directory.")
                print("Make sure you downloaded it from Google Cloud Console!")
                return

            flow = InstalledAppFlow.from_client_secrets_file(secret_file, SCOPES)
            # Run local server to authenticate on a fixed port
            creds = flow.run_local_server(port=8080)
        # Save the credentials for the next run
        with open(token_path, 'w') as token:
            token.write(creds.to_json())
            
    print("Authentication successful! token.json has been created.")
    print("SlipSync is now ready to send emails via Gmail API!")

if __name__ == '__main__':
    main()
