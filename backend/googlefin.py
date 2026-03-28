
import requests

# response = requests.get("https://www.google.com/finance/quote/SPY:NYSEARCA?")
# response = requests.get("https://www.cfbenchmarks.com/data/indices/BRTI")

CF_BRTI_BITCOIN = "https://www.cfbenchmarks.com/data/indices/BRTI"
CF_BRTI_BITCOIN_PRICE_HTML = "<span class=\"text-sm font-semibold tabular-nums md:text-2xl\">"

# def writeToTest(content):
#         with open("test.txt", "w", encoding="utf-8") as f:
#                 f.write(content)

with requests.get(CF_BRTI_BITCOIN, stream=True) as r:
    # Raise error if the site is down
    r.raise_for_status()
    
    content = ""
    for chunk in r.iter_content(chunk_size=1024, decode_unicode=True):
        if chunk:
            content += chunk
            
            # Check if our class is in the accumulated text
            if CF_BRTI_BITCOIN_PRICE_HTML in content:
                #print("Found the tag! Closing connection...")
                #writeToTest(content)
                r.close() 
                break

content = content[content.find(CF_BRTI_BITCOIN_PRICE_HTML) + len(CF_BRTI_BITCOIN_PRICE_HTML):]
print(content[:content.find("<")])
