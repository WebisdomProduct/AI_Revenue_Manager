import requests

payload = {
    "session_id": "TEST-1",
    "client_name": "Piya",
    "chatHistory": [],  # empty list for first test
    "userMessage": "Do you have a swimming pool?"
}

response = requests.post("http://127.0.0.1:8000/llm-chat", json=payload)
# print(response.json())
print("Status:", response.status_code)
print("Response:", response.text)
