import type { Network } from "hardhat/types";
import type { ChainConfig } from "../../src/types";

import { assert, expect } from "chai";
import { Etherscan } from "../../src/internal/etherscan";

describe("Etherscan", () => {
  const chainConfig = {
    network: "goerli",
    chainId: 5,
    urls: {
      apiURL: "https://api-goerli.etherscan.io/api",
      browserURL: "https://goerli.etherscan.io",
    },
  };

  describe("constructor", () => {
    it("should throw if the apiKey is undefined or empty", () => {
      expect(() => new Etherscan(undefined, chainConfig)).to.throw(
        /You are trying to verify a contract in 'goerli', but no API token was found for this network./
      );
      expect(() => new Etherscan("", chainConfig)).to.throw(
        /You are trying to verify a contract in 'goerli', but no API token was found for this network./
      );
    });

    it("should throw if the apiKey is an object but apiKey[network] is undefined or empty", () => {
      expect(() => new Etherscan({}, chainConfig)).to.throw(
        /You are trying to verify a contract in 'goerli', but no API token was found for this network./
      );
      expect(() => new Etherscan({ goerli: "" }, chainConfig)).to.throw(
        /You are trying to verify a contract in 'goerli', but no API token was found for this network./
      );
    });
  });

  describe("getCurrentChainConfig", () => {
    const customChains: ChainConfig[] = [
      {
        network: "customChain1",
        chainId: 5000,
        urls: {
          apiURL: "<api-url>",
          browserURL: "<browser-url>",
        },
      },
      {
        network: "customChain2",
        chainId: 5000,
        urls: {
          apiURL: "<api-url>",
          browserURL: "<browser-url>",
        },
      },
      {
        network: "customChain3",
        chainId: 4999,
        urls: {
          apiURL: "<api-url>",
          browserURL: "<browser-url>",
        },
      },
    ];

    it("should return the last matching custom chain defined by the user", async function () {
      const network = {
        name: "customChain2",
        provider: {
          async send() {
            return (5000).toString(16);
          },
        },
      } as unknown as Network;
      const currentChainConfig = await Etherscan.getCurrentChainConfig(
        network,
        customChains
      );

      assert.equal(currentChainConfig.network, "customChain2");
      assert.equal(currentChainConfig.chainId, 5000);
    });

    it("should return a built-in chain if no custom chain matches", async function () {
      const network = {
        name: "goerli",
        provider: {
          async send() {
            return (5).toString(16);
          },
        },
      } as unknown as Network;
      const currentChainConfig = await Etherscan.getCurrentChainConfig(
        network,
        customChains
      );

      assert.equal(currentChainConfig.network, "goerli");
      assert.equal(currentChainConfig.chainId, 5);
    });

    it("should throw if the selected network is hardhat and it's not a added to custom chains", async () => {
      const network = {
        name: "hardhat",
        provider: {
          async send() {
            return (31337).toString(16);
          },
        },
      } as unknown as Network;

      await expect(
        Etherscan.getCurrentChainConfig(network, customChains)
      ).to.be.rejectedWith(
        "The selected network is hardhat. Please select a network supported by Etherscan."
      );
    });

    it("should return hardhat if the selected network is hardhat and it was added as a custom chain", async () => {
      const network = {
        name: "hardhat",
        provider: {
          async send() {
            return (31337).toString(16);
          },
        },
      } as unknown as Network;

      const currentChainConfig = await Etherscan.getCurrentChainConfig(
        network,
        [
          ...customChains,
          {
            network: "hardhat",
            chainId: 31337,
            urls: {
              apiURL: "<api-url>",
              browserURL: "<browser-url>",
            },
          },
        ]
      );

      assert.equal(currentChainConfig.network, "hardhat");
      assert.equal(currentChainConfig.chainId, 31337);
    });

    it("should throw if there are no matches at all", async () => {
      const network = {
        name: "someNetwork",
        provider: {
          async send() {
            return (21343214123).toString(16);
          },
        },
      } as unknown as Network;

      await expect(
        Etherscan.getCurrentChainConfig(network, customChains)
      ).to.be.rejectedWith(
        /Trying to verify a contract in a network with chain id 21343214123, but the plugin doesn't recognize it as a supported chain./
      );
    });
  });

  describe("getContractUrl", () => {
    it("should return the contract url", () => {
      const expectedContractAddress =
        "https://goerli.etherscan.io/address/someAddress#code";
      let etherscan = new Etherscan("someApiKey", chainConfig);
      let contractUrl = etherscan.getContractUrl("someAddress");

      assert.equal(contractUrl, expectedContractAddress);

      etherscan = new Etherscan("someApiKey", {
        network: "goerli",
        chainId: 5,
        urls: {
          apiURL: "https://api-goerli.etherscan.io/api",
          browserURL: "   https://goerli.etherscan.io/  ",
        },
      });
      contractUrl = etherscan.getContractUrl("someAddress");

      assert.equal(contractUrl, expectedContractAddress);
    });
  });
});
