@echo ---
wsl --shutdown 
@echo ---
type %userprofile%\.wslconfig 
@echo.
@echo ---
wsl nslookup google.com 
@echo ---
wsl wget google.com && if exist index.html del index.html
@echo ---
wsl ping -c2 google.com
