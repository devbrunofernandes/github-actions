import requests
import time

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
    url = INPUT_URL
    max_trials = INPUT_MAX_TRIALS
    delay = INPUT_DELAY

    is_health = ping_url(url, max_trials, delay)
    if not is_health:
        raise Exception(f'Failed to connect into url {url}')

if __name__ == '__main__':
    run()