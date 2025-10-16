"""Tool implementations - copied from basicagent/tools.py"""

import json
import requests
from datetime import datetime
from greynoise import GreyNoise
from greynoise.exceptions import RequestFailure
import os


# Weather tools
def get_weather(location: str) -> str:
    """Call to get the current weather for a specific location."""
    if location.lower() in ["sf", "san francisco"]:
        return "It's 60 degrees and foggy."
    else:
        return "It's 90 degrees and sunny."


def get_coolest_cities() -> str:
    """Get a list of the coolest cities."""
    return "nyc, sf"


def get_current_time() -> str:
    """Get the current time."""
    return f"The current time is {datetime.now().strftime('%I:%M %p')}"


# GreyNoise IP intelligence tool
KEYS_TO_KEEP = ["ip", "seen", "classification", "first_seen", "last_seen", "tags", "metadata"]


def _get_ip_info(ip_address: str, api_key: str) -> str:
    """
    Retrieve information about an IP address from the GreyNoise API.
    Requires API key for full access.
    """
    try:
        api_client = GreyNoise(api_key=api_key)
        response = api_client.ip(ip_address)
        filtered_data = {key: response[key] for key in KEYS_TO_KEEP if key in response}
        json_data = json.dumps(filtered_data)
        return json_data
    except RequestFailure as e:
        return f"Failed to retrieve data for IP {ip_address}: {e}"


def _get_ip_greynoise_community(ip_address: str) -> str:
    """
    Get IP information from GreyNoise Community API (no key required).
    """
    url = f"https://api.greynoise.io/v3/community/{ip_address}"
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        return json.dumps(response.json())
    except requests.RequestException as e:
        return f"Failed to retrieve data for IP {ip_address}: {e}"


def greynoise_ip_address_tool(ip_address: str) -> str:
    """Get GreyNoise threat intelligence data for the given IP address."""
    api_key = os.getenv("GREYNOISE_API_KEY")
    if api_key:
        return _get_ip_info(ip_address, api_key)
    else:
        return _get_ip_greynoise_community(ip_address)

