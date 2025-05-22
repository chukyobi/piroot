import TelegramBot from 'node-telegram-bot-api';
import schedule from 'node-schedule';
import dotenv from 'dotenv';
import { getSeedPhrase } from './vault/vault';
import { deriveKeypairFromMnemonic, getBalance, transferPi } from './core/signer';

dotenv.config();

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN!;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID!;
const RECIPIENT_ADDRESS = process.env.RECIPIENT_ADDRESS!;
const TRANSFER_DATE = process.env.TRANSFER_DATE!;
const TRANSFER_AMOUNT = process.env.TRANSFER_AMOUNT || 'ALL';

if (!TELEGRAM_TOKEN || !ADMIN_CHAT_ID || !RECIPIENT_ADDRESS || !TRANSFER_DATE) {
  throw new Error('Missing required environment variables');
}

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

function sendTelegramLog(message: string) {
  return bot.sendMessage(ADMIN_CHAT_ID, message);
}

async function runScheduledTransfer() {
  try {
    await sendTelegramLog(`Starting scheduled transfer at ${new Date().toISOString()}`);

    const seed = getSeedPhrase(); 
    const keypair = deriveKeypairFromMnemonic(seed);

    const balance = await getBalance(keypair.publicKey());
    await sendTelegramLog(`Wallet balance: ${balance} Pi`);

    const amountToSend = TRANSFER_AMOUNT === 'ALL' ? balance : TRANSFER_AMOUNT;

    if (parseFloat(amountToSend) <= 0) {
      await sendTelegramLog(`Transfer aborted — insufficient balance.`);
      return;
    }

    const result = await transferPi(keypair, RECIPIENT_ADDRESS, amountToSend);
    await sendTelegramLog(`Transfer successful! Tx Hash: ${result.hash}`);
  } catch (error) {
    await sendTelegramLog(` Transfer failed: ${(error as Error).message}`);
  }
}

const scheduleDate = new Date(TRANSFER_DATE);
if (scheduleDate <= new Date()) {
  throw new Error('TRANSFER_DATE must be in the future');
}

schedule.scheduleJob(scheduleDate, runScheduledTransfer);

console.log(`Bot launched. Waiting for scheduled transfer on ${scheduleDate.toISOString()}`);
