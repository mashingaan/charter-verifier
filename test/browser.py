import base64
import functools
import json
import os
import pathlib
import threading
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright

root = pathlib.Path(__file__).resolve().parent.parent
fixture = json.loads((root / 'test/browser-fixture.json').read_text())
assert fixture['synthetic'] is True
handler = functools.partial(SimpleHTTPRequestHandler, directory=str(root))
server = ThreadingHTTPServer(('127.0.0.1', 0), handler)
threading.Thread(target=server.serve_forever, daemon=True).start()
out = root / 'test-results'
out.mkdir(exist_ok=True)
try:
    with sync_playwright() as p:
        channel = os.environ.get('CHARTER_BROWSER_CHANNEL')
        browser = p.chromium.launch(headless=True, **({'channel': channel} if channel else {}))
        try:
            for theme in ['light', 'dark']:
                page = browser.new_page(viewport={'width': 360, 'height': 800}, color_scheme=theme)
                errors = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.route('https://rpc.invalid/**', lambda route: route.fulfill(json={'jsonrpc': '2.0', 'id': 1, 'result': fixture['rpc']}))
                page.route('https://ipfs.invalid/**', lambda route: route.fulfill(body=base64.b64decode(fixture['texts'][int(route.request.url[-1])-1])))
                page.goto(f'http://127.0.0.1:{server.server_port}/')
                page.wait_for_load_state('networkidle')
                assert page.locator('#verify-form').count() == 1
                page.locator('#network').select_option('base-sepolia')
                assert page.locator('#rpc').input_value() == 'https://sepolia.base.org'
                page.locator('#rpc').fill('https://rpc.invalid/')
                page.locator('#gateway').fill('https://ipfs.invalid/')
                page.locator('#uid').fill(fixture['uid'])
                page.get_by_role('button', name='Verify exact bytes').click()
                page.get_by_role('status').filter(has_text='All texts match').wait_for()
                assert page.locator('article').count() == 3
                assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
                assert page.locator('#verify').is_enabled()
                page.screenshot(path=str(out / f'synthetic-match-360-{theme}.png'), full_page=True)
                page.unroute('https://rpc.invalid/**')
                page.route('https://rpc.invalid/**', lambda route: route.fulfill(json={'error': {'message': 'unavailable'}}))
                page.get_by_role('button', name='Verify exact bytes').click()
                page.get_by_role('status').filter(has_text='could not be read').wait_for()
                assert page.locator('#verify').is_enabled()
                assert errors == [], errors
                page.close()
        finally:
            browser.close()
finally:
    server.shutdown()
    server.server_close()
