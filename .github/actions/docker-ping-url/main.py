import requests
import time
import os

def ping_url(url, delay, max_trials):
    print(f'Starting connection to "{url}".')
    trials = 0
    while trials < max_trials:
        trials += 1
        response = requests.get(url=url)
        response_code = response.raise_for_status()
        if response_code == 200:
            print(f'Sucessfully connect to URL {url}')
            return True
        print(f'Connection failed, received status code {response_code} expected 200.')
        print(f'Trying again in {delay} seconds...')
        time.sleep(delay)
    print(f'All {trials} attempt(s) failed to connect in URL {url}')
    return False

def run():
    url = os.getenv('INPUT_URL') 
    max_trials = int(os.getenv('INPUT_MAX_TRIALS'))
    delay = int(os.getenv('INPUT_DELAY'))

    if not url or not max_trials or not delay:
        raise Exception('Missing core input variables (url, max_trials or delay).')

    is_health = ping_url(url, max_trials, delay)
    if not is_health:
        raise Exception(f'Failed to connect into url {url}')

if __name__ == '__main__':
    run()