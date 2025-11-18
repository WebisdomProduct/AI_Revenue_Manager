##############################################################################################################
# 3 separate functions to send out SMS, WhatsApp and Email
#=============================================================================================================
# SMS:
# 'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN' should be fetched from config.py
    # If possible from OS environment (.env)
# Message 'body', 'from_' and 'to' fields should be trigger_sms() function arguments
#=============================================================================================================
# WhatsApp:
# 'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN' should be fetched from config.py
    # If possible from OS environment (.env)
# Message 'body', 'from_' and 'to' fields should be trigger_whatsapp_msg() function arguments
#=============================================================================================================
# Email:
# SENDGRID_API_KEY should be fetched from config.py
    # If possible from OS environment (.env)
# 'from_email', 'to_emails', 'subject', and 'emailText' fields should be trigger_email() function arguments
##############################################################################################################
# import os
from datetime import datetime, time as dtime
from twilio.rest import Client
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

from config import (
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    SENDGRID_API_KEY,
)

# MSG_BODY="!!! test sms from twilio !!!"
SMS_MSG_FROM="+18782511984",
WHATSAPP_MSG_FROM="whatsapp:+14155238886"
EMAIL_MSG_FROM = "Umang.Malhotra@webisdom.com"

def match_send_time(msg_time):
    
    # Safely handle msg_time (can be str, time, or None)
    parsed_time = None

    if isinstance(msg_time, dtime):
        parsed_time = msg_time
    
    elif isinstance(msg_time, str) and msg_time.strip():
        for fmt in ("%H:%M", "%I:%M %p", "%H.%M", "%I.%M %p"):
            try:
                parsed_time = datetime.strptime(msg_time.strip(), fmt).time()
                break
            except ValueError:
                continue
    
    return parsed_time

def trigger_sms(msg_body, msg_from, msg_to, msg_time):
    client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

    # match msg_time with current time
    now = datetime.now().time()

    parsed_time = match_send_time(msg_time)

    if parsed_time and now >= parsed_time:
        message = client.messages.create(
            body=msg_body,
            # from_=msg_from,
            from_=SMS_MSG_FROM,
            to=msg_to,
        )
        print("✅"f"📤 [SMS SENT] From: {msg_from} | To: {msg_to} | Msg: {msg_body[:50]}...")
    elif parsed_time:
        print(f"⏳ Not time yet — current: {now.strftime('%H:%M:%S')} < scheduled: {parsed_time.strftime('%H:%M')}")
    else:
        print(f"⚠️ Invalid msg_time ({msg_time}) — skipping send.")

def trigger_whatsapp_msg(msg_body, msg_from, msg_to, msg_time):
    client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

    # match msg_time with current time
    now = datetime.now().time()

    parsed_time = match_send_time(msg_time)

    if parsed_time and now >= parsed_time:
        message = client.messages.create(
            body=msg_body,
            # from_=msg_from,
            from_=WHATSAPP_MSG_FROM,
            to=msg_to,
        )
        print("✅"f"📤 [WhatsApp msg SENT] From: {msg_from} | To: {msg_to} | Msg: {msg_body[:50]}...")
    elif parsed_time:
        print(f"⏳ Not time yet — current: {now.strftime('%H:%M:%S')} < scheduled: {parsed_time.strftime('%H:%M')}")
    else:
        print(f"⚠️ Invalid msg_time ({msg_time}) — skipping send.")

def trigger_email(msg_body, msg_from, msg_to, mail_sub, msg_time):
    
    # match msg_time with current time
    now = datetime.now().time()

    parsed_time = match_send_time(msg_time)

    if parsed_time and now >= parsed_time:
        message = Mail(
            from_email=EMAIL_MSG_FROM,
            to_emails=msg_to,
            subject=mail_sub,
            html_content=msg_body)
        try:
            # sg = SendGridAPIClient(os.environ.get('SENDGRID_API_KEY'))
            sg = SendGridAPIClient(SENDGRID_API_KEY)

            # sg.set_sendgrid_data_residency("eu")
            # uncomment the above line if you are sending mail using a regional EU subuser

            sg.send(message)
            # response = sg.send(message)
            # print(response.status_code)
            # print(response.body)
            # print(response.headers)
        except Exception as e:
            print(e.message)
            # print(str(e))

        print("✅"f"📤 [Email SENT] From: {msg_from} | To: {msg_to} | Msg: {msg_body[:50]}...")
    elif parsed_time:
        print(f"⏳ Not time yet — current: {now.strftime('%H:%M:%S')} < scheduled: {parsed_time.strftime('%H:%M')}")
    else:
        print(f"⚠️ Invalid msg_time ({msg_time}) — skipping send.")
