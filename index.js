require('dotenv').config();
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Dam bao stdout/stderr dung UTF-8
process.stdout.setEncoding('utf8');
process.stderr.setEncoding('utf8');

// --- CONFIG ---
const CONFIG = {
  RPC_URL: process.env.RPC_URL,
  MIN_AMOUNT: 0.001,
  MAX_AMOUNT: 0.005,
  RETRIES: 10,
  DELAY: 5000,
  TX_DELAY: 2000,
  SERVER_RETRY_DELAY: 5000,
  DEFAULT_GAS_PRICE: ethers.parseUnits('10', 'gwei') // 10 Gwei mac dinh
};

if (!CONFIG.RPC_URL) throw new Error('RPC_URL khong duoc dinh nghia trong .env');

const LOG_FILE = path.join(__dirname, 'log.txt');
const ERROR_LOG_FILE = path.join(__dirname, 'error.log');

const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);

// --- Logging ---
const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a', encoding: 'utf8' });
const errorStream = fs.createWriteStream(ERROR_LOG_FILE, { flags: 'a', encoding: 'utf8' });

function log(message) {
  const time = new Date().toISOString();
  const fullMessage = `[${time}] ${message}`;
  console.log(fullMessage);
  logStream.write(fullMessage + '\n');
}

function logError(message) {
  const time = new Date().toISOString();
  const fullMessage = `[${time}] ${message}`;
  console.error(fullMessage);
  errorStream.write(fullMessage + '\n');
}

// --- Load data ---
let addresses, wallets;
try {
  addresses = JSON.parse(fs.readFileSync('./addresses.json'));
  wallets = JSON.parse(fs.readFileSync('./wallets.json'));
} catch (error) {
  logError(`Loi khi doc file: ${error.message}`);
  process.exit(1);
}

// --- Utility ---
function getRandomAmount(min, max, decimals = 3) {
  const random = Math.random() * (max - min) + min;
  return ethers.parseEther(random.toFixed(decimals));
}

async function waitForReceipt(txHash, retries = CONFIG.RETRIES, delay = CONFIG.DELAY) {
  for (let i = 0; i < retries; i++) {
    try {
      const receipt = await provider.getTransactionReceipt(txHash);
      if (receipt) return receipt;
    } catch (err) {
      log(`Doi receipt... (lan thu ${i + 1})`);
    }
    await new Promise(res => setTimeout(res, delay));
  }
  throw new Error('Khong tim thay receipt sau nhieu lan thu');
}

// --- Send with retry logic ---
async function sendWithRetry(wallet, to, value, gasLimit, initialGasPrice, retries = 3) {
  let attempt = 0;
  let currentGasPrice = initialGasPrice;

  while (attempt < retries) {
    const nonce = await provider.getTransactionCount(wallet.address, 'pending');
    try {
      const tx = await wallet.sendTransaction({
        to,
        value,
        gasLimit,
        gasPrice: currentGasPrice,
        nonce
      });
      log(`Gui giao dich | Tx: ${tx.hash} | Gas Price: ${ethers.formatUnits(currentGasPrice, 'gwei')} gwei | Nonce: ${nonce}`);
      await waitForReceipt(tx.hash);
      return tx.hash;
    } catch (error) {
      if (error.code === 'REPLACEMENT_UNDERPRICED') {
        attempt++;
        currentGasPrice = currentGasPrice * 120n / 100n;
        log(`Thu lai ${attempt}/${retries} voi gas price cao hon: ${ethers.formatUnits(currentGasPrice, 'gwei')} gwei`);
        await new Promise(res => setTimeout(res, 1000));
      } else if (error.code === 'NONCE_EXPIRED') {
        attempt++;
        log(`Thu lai ${attempt}/${retries} vi nonce qua thap, lay nonce moi`);
        await new Promise(res => setTimeout(res, 1000));
      } else if (error.code === 'SERVER_ERROR' && (error.info?.responseStatus?.includes('502') || error.info?.responseStatus?.includes('503'))) {
        attempt++;
        log(`Thu lai ${attempt}/${retries} vi loi server ${error.info?.responseStatus || 'unknown'}`);
        await new Promise(res => setTimeout(res, CONFIG.SERVER_RETRY_DELAY));
      } else {
        throw error;
      }
    }
  }
  throw new Error(`Het so lan thu lai cho giao dich toi ${to}`);
}

// --- Main send logic ---
const sendTea = async () => {
  try {
    let counter = 1;

    for (let i = 0; i < wallets.length; i++) {
      const wallet = new ethers.Wallet(wallets[i], provider);
      log(`Vi ${i + 1}: ${wallet.address}`);

      for (const address of addresses) {
        if (!ethers.isAddress(address)) {
          logError(`Dia chi khong hop le: ${address}`);
          continue;
        }

        const amountInEther = getRandomAmount(CONFIG.MIN_AMOUNT, CONFIG.MAX_AMOUNT);
        const balance = await provider.getBalance(wallet.address);
        let initialGasPrice = await provider.getFeeData().then(fee => fee.gasPrice);
        initialGasPrice = initialGasPrice < CONFIG.DEFAULT_GAS_PRICE ? CONFIG.DEFAULT_GAS_PRICE : initialGasPrice;
        const gasLimit = await wallet.estimateGas({ to: address, value: amountInEther });
        const gasCost = initialGasPrice * gasLimit;

        if (balance < amountInEther + gasCost) {
          log(`Vi ${wallet.address} khong du so du (${ethers.formatEther(balance)} ETH)`);
          continue;
        }

        try {
          const txHash = await sendWithRetry(
            wallet,
            address,
            amountInEther,
            gasLimit,
            initialGasPrice
          );

          log(`${counter}. Da gui ${ethers.formatEther(amountInEther)} TEA toi ${address} | Tx: ${txHash}`);
          counter++;
          await new Promise(res => setTimeout(res, CONFIG.TX_DELAY));
        } catch (error) {
          logError(`Gui that bai toi ${address} tu ${wallet.address}: ${error.message}`);
        }
      }

      log('--- Hoan thanh gui tu vi nay ---');
    }

    log("Da gui xong toi tat ca dia chi.");
  } catch (error) {
    logError(`Loi toan cuc: ${error.message}`);
  } finally {
    logStream.end();
    errorStream.end();
  }
};

sendTea();