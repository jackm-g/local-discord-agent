"""Tool definitions for the agent."""

import json
import requests
from langchain_core.tools import tool
from greynoise import GreyNoise
from greynoise.exceptions import RequestFailure

try:
    from config import GREYNOISE_API_KEY
except ImportError:
    from .config import GREYNOISE_API_KEY


# Weather tools
@tool
def get_weather(location: str):
    """Call to get the current weather for a specific location."""
    if location.lower() in ["sf", "san francisco"]:
        return "It's 60 degrees and foggy."
    else:
        return "It's 90 degrees and sunny."


@tool
def get_coolest_cities():
    """Get a list of the coolest cities."""
    return "nyc, sf"


@tool
def get_current_time():
    """Get the current time."""
    from datetime import datetime
    return f"The current time is {datetime.now().strftime('%I:%M %p')}"


# GreyNoise IP intelligence tool
KEYS_TO_KEEP = ["ip", "seen", "classification", "first_seen", "last_seen", "tags", "metadata"]


def _get_ip_info(ip_address: str) -> str:
    """
    Retrieve information about an IP address from the GreyNoise API.
    Requires API key for full access.
    """
    try:
        api_client = GreyNoise(api_key=GREYNOISE_API_KEY)
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


@tool
def greynoise_ip_address_tool(ip_address: str):
    """Get GreyNoise threat intelligence data for the given IP address."""
    if GREYNOISE_API_KEY:
        return _get_ip_info(ip_address)
    else:
        return _get_ip_greynoise_community(ip_address)


# List of all available tools
ALL_TOOLS = [
    get_weather,
    get_coolest_cities,
    get_current_time,
    greynoise_ip_address_tool,
]

