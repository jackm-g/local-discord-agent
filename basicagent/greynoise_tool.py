import requests
from langchain.tools import tool
from greynoise import GreyNoise
from greynoise.exceptions import RequestFailure
import os
from dotenv import load_dotenv
import json

# Docs for API: https://greynoise.readthedocs.io/en/latest/index.html

load_dotenv()
API_KEY = os.getenv("GREYNOISE_API_KEY")
KEYS_TO_KEEP = ["ip", "seen", "classification", "first_seen", "last_seen", "tags", "metadata"]

def get_ip_info(ip_address):
    """
    Retrieve information about an IP address from the GreyNoise API.
    """
    try:
        api_client = GreyNoise(api_key=API_KEY)
        response = api_client.ip(ip_address)
        filtered_data = {key: response[key] for key in KEYS_TO_KEEP if key in response}
        json_data = json.dumps(filtered_data)
        print(json_data)
        return json_data
    
    # TODO: RateLimitError and NotFound Error from greynoise package
    except RequestFailure as e:
        print(f"Failed to retrieve data for IP {ip_address}: {e}")
        return None

def get_ip_greynoise_community(ip_address: str):
    url = f"https://api.greynoise.io/v3/community/{ip_address}"
    response = requests.get(url)
    print("greynoise response")
    print(response.json())
    return response.json()

@tool
def greynoise_ip_address_tool(ip_address: str):
    """Get the greynoise data for the given ip address"""
    if API_KEY is not None:
        return get_ip_info(ip_address)
    else:
        return get_ip_greynoise_community(ip_address)

if __name__ == "__main__":
    print(get_ip_info("165.154.40.205"))
