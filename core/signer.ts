import bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';
import Server, {
  Keypair,
  TransactionBuilder,
  Operation,
  Asset,
} from 'stellar-sdk';

const PI_COIN_TYPE = 314159;
const SERVER_URL = 'https://api.mainnet.minepi.com'; 


export function deriveKeypairFromMnemonic(mnemonic: string): Keypair {
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const path = `m/44'/${PI_COIN_TYPE}'/0'`;
  const derived = derivePath(path, seed.toString('hex'));
  return Keypair.fromRawEd25519Seed(derived.key);
}


export async function transferPi(
  senderKeypair: Keypair,
  recipientAddress: string,
  amount: string
) {
  const server = new Server(SERVER_URL);
  const account = await server.loadAccount(senderKeypair.publicKey());
  const fee = await server.fetchBaseFee();

  const tx = new TransactionBuilder(account, {
    fee: fee.toString(),
    networkPassphrase: "Pi Network"
  })
    .addOperation(Operation.payment({
      destination: recipientAddress,
      asset: Asset.native(),
      amount,
    }))
    .setTimeout(180)
    .build();

  tx.sign(senderKeypair);
  return server.submitTransaction(tx);
}

export async function getBalance(publicKey: string): Promise<string> {
    const server = new Server(SERVER_URL);
    const account = await server.loadAccount(publicKey);
  
    const nativeBalance = account.balances.find(
      (b: { asset_type: string; balance: string }) => b.asset_type === 'native'
    );
  
    return nativeBalance?.balance || '0';
  }
  