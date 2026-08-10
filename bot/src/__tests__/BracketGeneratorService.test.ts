import { describe, it, expect } from "vitest";
import { BracketGeneratorService } from "../services/BracketGeneratorService";

describe("BracketGeneratorService", () => {
  describe("getStandardSeeds", () => {
    it("should return correct standard seeds for a 4-team bracket", () => {
      const seeds = BracketGeneratorService.getStandardSeeds(4);
      expect(seeds).toEqual([1, 4, 2, 3]);
    });

    it("should return correct standard seeds for an 8-team bracket", () => {
      const seeds = BracketGeneratorService.getStandardSeeds(8);
      expect(seeds).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
    });

    it("should return correct standard seeds for a 16-team bracket", () => {
      const seeds = BracketGeneratorService.getStandardSeeds(16);
      expect(seeds.length).toBe(16);
      expect(seeds[0]).toBe(1);
      expect(seeds[1]).toBe(16);
      expect(seeds[2]).toBe(8);
      expect(seeds[3]).toBe(9);
    });

    it("should ensure every seed pair sums to (bracketSize + 1) in initial rounds", () => {
      const size = 32;
      const seeds = BracketGeneratorService.getStandardSeeds(size);
      expect(seeds.length).toBe(size);

      for (let i = 0; i < seeds.length; i += 2) {
        expect(seeds[i]! + seeds[i + 1]!).toBe(size + 1);
      }
    });
  });
});
