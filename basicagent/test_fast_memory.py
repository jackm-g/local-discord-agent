"""Unit tests for the fast_memory module."""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from fast_memory import app

client = TestClient(app)

@pytest.fixture
def mock_ollama_llm():
    with patch('fast_memory.ollama_llm') as mock:
        yield mock

def test_inference_endpoint_success(mock_ollama_llm):
    """Test successful inference request."""
    mock_response = MagicMock()
    mock_response.content = "Test response"
    mock_ollama_llm.return_value = mock_response

    response = client.post(
        "/inference",
        json={"message": "Test message"}
    )

    assert response.status_code == 200
    assert response.json() == {"ai_response": "Test response"}
    mock_ollama_llm.assert_called_once()

def test_inference_endpoint_missing_message():
    """Test inference request with missing message."""
    response = client.post(
        "/inference",
        json={}
    )
    
    assert response.status_code == 400

def test_inference_endpoint_server_error(mock_ollama_llm):
    """Test inference request with server error."""
    mock_ollama_llm.side_effect = Exception("Test error")

    response = client.post(
        "/inference",
        json={"message": "Test message"}
    )
    
    assert response.status_code == 500

if __name__ == '__main__':
    pytest.main([__file__]) 