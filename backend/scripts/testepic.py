import requests

base_url = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js"
response = requests.get(base_url)
print(response.text)