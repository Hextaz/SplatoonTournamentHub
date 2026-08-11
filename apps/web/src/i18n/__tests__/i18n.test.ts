import { describe, it, expect } from "vitest";
import { t, getTranslationValue } from "../index";
import { fr } from "../locales/fr";
import { en } from "../locales/en";

describe("Internationalization (i18n) Module", () => {
  it("should retrieve translation values by dot notation path", () => {
    expect(getTranslationValue(fr, "common.loading")).toBe("Chargement...");
    expect(getTranslationValue(en, "common.loading")).toBe("Loading...");
    expect(getTranslationValue(fr, "home.heroTitleHighlight")).toBe("Splatoon");
  });

  it("should fallback to key if translation key does not exist", () => {
    expect(t("fr", "nonexistent.key.path")).toBe("nonexistent.key.path");
    expect(t("en", "another.missing.key")).toBe("another.missing.key");
  });

  it("should interpolate parameters into translation string", () => {
    const frResult = t("fr", "tournaments.teamsCount", { count: 8 });
    expect(frResult).toBe("8 Équipes (4 joueurs)");

    const enResult = t("en", "tournaments.teamsCount", { count: 8 });
    expect(enResult).toBe("8 Teams (4 players)");
  });

  it("should correctly translate navigation keys for French and English", () => {
    expect(t("fr", "nav.myServers")).toBe("Mes Serveurs");
    expect(t("en", "nav.myServers")).toBe("My Servers");

    expect(t("fr", "nav.loginDiscord")).toBe("Connexion Discord");
    expect(t("en", "nav.loginDiscord")).toBe("Discord Login");
  });

  it("should correctly translate admin lifecycle keys", () => {
    expect(t("fr", "admin.launchTournament")).toBe("Lancer le Tournoi");
    expect(t("en", "admin.launchTournament")).toBe("Launch Tournament");
  });
});
