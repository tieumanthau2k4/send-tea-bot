# Send-Tea-Bot

Bot tu dong gui giao dich TEA tren mang tea-sepolia su dung ethers.js va Alchemy RPC.

## Mo ta

Du an nay la mot bot Node.js giup tu dong gui mot luong TEA ngau nhien (tu 0.001 den 0.005 TEA) toi danh sach dia chi duoc khai bao trong file `addresses.json`. Bot su dung private key tu `wallets.json` va ket noi qua Alchemy RPC.

## Tinh nang

- Gui TEA ngau nhien toi nhieu dia chi.
- Xu ly loi nonce, gas price, va rate limit.
- Ghi log chi tiet vao `log.txt` va `error.log`.
- Ho tro retry khi gap loi mang hoac server.

## Cai dat

1. **Clone repository**:
   ```bash
   git clone https://github.com/tieumanthau2k4/send-tea-bot.git
   cd send-tea-bot
 2. Cai dat dependencies
    ```npm install```
3. Cau hinh file .env
Tao file .env trong thu muc goc va them:
```RPC_URL=https://tea-sepolia.g.alchemy.com/v2/YOUR_API_KEY```
Cach su dung
 1 Chuan bi du lieu:
Cap nhat danh sach dia chi trong ```addresses.json```
Them private key cua vi gui trong ```wallets.json```.
2 Chay bot
 ```node index.js```
3 Xem log
  Log giao dich: log.txt
  Log loi: error.log
Yeu cau
  Node.js v18.x hoac cao hon.
  Git.
  Tai khoan Alchemy voi API key.
Cau hinh
 File .env
   RPC_URL: URL cua Alchemy RPC (vi du: https://tea-sepolia.g.alchemy.com/v2/YOUR_API_KEY).
 File addresses.json:
   ```["0xAddress1", "0xAddress2", ...]```
 File wallets.json:
  ```["0xAddress1", "0xAddress2", ...]```
















 

