def pytest_configure(config):
    config.addinivalue_line("markers", "integration: real API calls; needs VISION_TEST_PHOTOS")
