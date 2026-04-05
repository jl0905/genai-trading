
import requests
import json
import sys

CF_BRTI_BITCOIN = "https://www.cfbenchmarks.com/data/indices/BRTI"
CF_BRTI_BITCOIN_PRICE_HTML = "<span class=\"text-sm font-semibold tabular-nums md:text-2xl\">"

def get_bitcoin_price():
    try:
        with requests.get(CF_BRTI_BITCOIN, stream=True) as r:
            r.raise_for_status()
            
            content = ""
            for chunk in r.iter_content(chunk_size=1024, decode_unicode=True):
                if chunk:
                    content += chunk
                    
                    if CF_BRTI_BITCOIN_PRICE_HTML in content:
                        r.close() 
                        break

        content = content[content.find(CF_BRTI_BITCOIN_PRICE_HTML) + len(CF_BRTI_BITCOIN_PRICE_HTML):]
        price = content[:content.find("<")]
        
        return json.dumps({"price": price.strip(), "source": "CF Benchmarks BRTI"})
    except Exception as e:
        return json.dumps({"error": str(e)})

if __name__ == "__main__":
    result = get_bitcoin_price()
    print(result)
