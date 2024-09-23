import { FastifyInstance } from 'fastify';
import prisma from '../utils/prisma';
//import { ethers } from 'ethers';

const contractAddress = 'YOUR_CONTRACT_ADDRESS';
/*const contractABI = [
  // Your contract ABI
];*/

export async function nftRoutes(server: FastifyInstance) {
  /*
    server.post('/mint', async (request, reply) => {
    const { to, tokenURI } = request.body as {
      to: string;
      tokenURI: string;
    };

    try {
      const provider = new ethers.providers.JsonRpcProvider(
        process.env.ETH_NODE_URL,
      );
      const wallet = new ethers.Wallet(process.env.ETH_PRIVATE_KEY!, provider);
      const contract = new ethers.Contract(
        contractAddress,
        contractABI,
        wallet,
      );

      const tx = await contract.mint(to, tokenURI);
      await tx.wait();

      reply.send({ transactionHash: tx.hash });
    } catch (error) {
      reply.status(500).send({ error: error.message });
    }
  });

  // Add other CRUD operations (GET, PUT, DELETE)
  // Example: GET all NFTs
  server.get('/', async (request, reply) => {
    const nfts = await prisma.nft.findMany();
    reply.send(nfts);
  });*/
}
