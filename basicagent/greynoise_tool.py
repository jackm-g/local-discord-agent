import requests
from langchain.tools import tool


def get_greynoise_data(ip_address: str):
    url = f"https://api.greynoise.io/v3/community/{ip_address}"
    response = requests.get(url)
    print("greynoise response")
    print(response.json())
    return response.json()

@tool
def greynoise_ip_address_tool(ip_address: str):
    """Get the greynoise data for the given ip address"""
    return get_greynoise_data(ip_address)

if __name__ == "__main__":
    print(get_greynoise_data("8.8.8.8"))
