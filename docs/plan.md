# Plan: Spin The Wheel

## Kontext

Greenfield-projekt — en **generisk "Spin the Wheel"-webbapp** byggd som Blazor WebAssembly, hostad på Azure Static Web Apps (Free tier). Appen har två användningslägen:

- **Läge A — Ad-hoc (interaktivt):** Användaren besöker appen i webbläsaren, skriver in valfria alternativ, spinner hjulet, och delar resultatet via URL.
- **Läge B — Automatiserat (Power Automate):** Ett Power Automate-flöde anropar ett API varje måndag 07:00, slumpar supportansvariga ur en teamlista, och postar resultatet som Adaptive Card i Microsoft Teams med en länk till appen.

Ingen databas — all state kodas i URL:en (base64url). Ingen GIF-generering — animationen sker live i webbläsaren (SVG + CSS). Azure Functions (managed, ingår i SWA Free) hanterar API-anrop.

### Verifierad miljö
- .NET 10 SDK `10.0.201` installerad
- `wasm-tools` workload installerad (krävs för Blazor WASM AOT)
- `blazorwasm` projektmall tillgänglig med `net10.0`-stöd
- SWA CLI `2.0.9` tillgänglig via npx
- Azure Functions Core Tools **ej installerade** lokalt (behöver installeras)

---

## 1. Arkitekturöversikt

```
┌─────────────────────────────────────────────────────────┐
│              Azure Static Web Apps (Free tier)           │
│                                                         │
│  ┌──────────────────────┐  ┌─────────────────────────┐  │
│  │   Blazor WASM Client │  │  Azure Functions (API)  │  │
│  │                      │  │                         │  │
│  │  / ─── Home/Create   │  │  POST /api/spin         │  │
│  │  /result/{state}     │  │  → slumpa + returnera   │  │
│  │                      │  │    resultat + URL        │  │
│  │  SVG hjul + CSS      │  │                         │  │
│  │  animering i browser │  │  Anropas av:            │  │
│  │                      │  │  • Power Automate       │  │
│  └──────────────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
         ▲                              ▲
         │ Besökare öppnar              │ POST varje måndag 07:00
         │ delad URL                    │
    ┌────┴────┐                  ┌──────┴──────┐
    │  Vem som│                  │   Power     │
    │  helst  │                  │  Automate   │──► Teams-kanal
    └─────────┘                  └─────────────┘   (Adaptive Card
                                                    + länk till app)
```

### Varför denna arkitektur?

| Aspekt | Beslut | Motivering |
|---|---|---|
| **Hosting** | Azure SWA Free tier | Gratis, global CDN, managed Functions ingår, custom domain, GitHub Actions deploy |
| **Frontend** | Blazor WASM (standalone) | C#-kompetens i teamet, ingen JS-ramverk att lära, delad logik med API |
| **Backend** | Azure Functions (SWA managed) | Krävs bara för Power Automate-läget, en enda endpoint, noll extra kostnad |
| **Persistens** | URL-kodad state | Ingen databas, inga driftskostnader, URL:er är delbara och självförsörjande |
| **Animation** | SVG + CSS i browser | Smidigare än GIF, skalbar, interaktiv, noll serverbelastning |
| **Teams** | Power Automate Workflow | O365 Connectors/Incoming Webhooks fasas ut dec 2025 — PA är framtidssäkert |

---

## 2. Projektstruktur

```
SpinTheWheel/
├── SpinTheWheel.sln
├── .github/
│   └── workflows/
│       └── azure-static-web-apps.yml        # GitHub Actions deploy-pipeline
│
├── src/
│   ├── SpinTheWheel.Client/                  # Blazor WASM (frontend)
│   │   ├── wwwroot/
│   │   │   ├── index.html                    # Blazor host-sida
│   │   │   ├── css/
│   │   │   │   └── app.css                   # Global styling + hjul-animationer
│   │   │   ├── js/
│   │   │   │   └── wheel-interop.js          # Minimal JS: clipboard API, animation callbacks
│   │   │   └── staticwebapp.config.json      # SWA routing-konfiguration
│   │   ├── Layout/
│   │   │   ├── MainLayout.razor              # App-layout (header, footer)
│   │   │   └── MainLayout.razor.css          # Scoped CSS
│   │   ├── Pages/
│   │   │   ├── Home.razor                    # Startsida: skapa hjul + snurra (Läge A)
│   │   │   ├── Home.razor.css                # Scoped CSS
│   │   │   ├── SpinResult.razor              # Resultat: visa animation + resultat (delbar URL)
│   │   │   └── SpinResult.razor.css          # Scoped CSS
│   │   ├── Components/
│   │   │   ├── WheelSvg.razor                # SVG-hjulet: renderar segment, hanterar rotation
│   │   │   ├── WheelSvg.razor.css            # Scoped CSS (animation keyframes)
│   │   │   ├── ItemEditor.razor              # Inputlista: lägg till/ta bort alternativ
│   │   │   ├── ItemEditor.razor.css
│   │   │   ├── ResultPanel.razor             # Visar valda alternativ efter spin
│   │   │   ├── ResultPanel.razor.css
│   │   │   └── ShareLink.razor               # "Kopiera länk"-knapp med clipboard API
│   │   ├── Services/
│   │   │   ├── SpinService.cs                # Client-side slumpning (ad-hoc mode)
│   │   │   └── UrlStateService.cs            # Encode/decode SpinState ↔ base64url
│   │   ├── Program.cs                        # Blazor WASM startup, DI-registrering
│   │   ├── _Imports.razor                    # Globala using-satser
│   │   └── SpinTheWheel.Client.csproj
│   │
│   ├── SpinTheWheel.Api/                     # Azure Functions (backend API)
│   │   ├── Functions/
│   │   │   └── SpinFunction.cs               # POST /api/spin endpoint
│   │   ├── Program.cs                        # Functions Host startup
│   │   ├── host.json                         # Functions host-konfiguration
│   │   ├── local.settings.json               # Lokala utvecklingsinställningar
│   │   └── SpinTheWheel.Api.csproj
│   │
│   └── SpinTheWheel.Shared/                  # Delad logik (Client + Api refererar hit)
│       ├── Models/
│       │   ├── SpinState.cs                  # Fullständigt state: items, count, selected, seed
│       │   ├── SpinRequest.cs                # API request-modell: items + count
│       │   └── SpinResponse.cs               # API response-modell: selected + url
│       ├── Services/
│       │   ├── IWheelSpinner.cs              # Interface: välj N av M items
│       │   ├── WheelSpinner.cs               # Implementation: Fisher-Yates med seed
│       │   └── StateEncoder.cs               # JSON → base64url encode/decode
│       ├── Validation/
│       │   └── SpinValidator.cs              # Validera items/count-kombinationer
│       └── SpinTheWheel.Shared.csproj
│
├── tests/
│   ├── SpinTheWheel.Shared.Tests/
│   │   ├── WheelSpinnerTests.cs              # Slumpningslogik, edge cases
│   │   ├── StateEncoderTests.cs              # Encode/decode roundtrip, specialtecken
│   │   ├── SpinValidatorTests.cs             # Valideringsregler
│   │   └── SpinTheWheel.Shared.Tests.csproj
│   ├── SpinTheWheel.Client.Tests/
│   │   ├── Pages/
│   │   │   ├── HomeTests.cs                  # bUnit: sidan renderar, input fungerar
│   │   │   └── SpinResultTests.cs            # bUnit: dekodning, felhantering
│   │   ├── Components/
│   │   │   └── WheelSvgTests.cs              # bUnit: segment renderas korrekt
│   │   └── SpinTheWheel.Client.Tests.csproj
│   ├── SpinTheWheel.Api.Tests/
│   │   ├── SpinFunctionTests.cs              # Enhetstester: function-klass direkt
│   │   └── SpinTheWheel.Api.Tests.csproj
│   └── SpinTheWheel.E2E.Tests/               # Playwright + HTTP-integrationstester
│       ├── Infrastructure/
│       │   ├── SwaFixture.cs                 # Startar/stoppar SWA CLI för tester
│       │   └── PlaywrightFixture.cs          # Hanterar browser-livscykel
│       ├── Browser/
│       │   ├── HomePageTests.cs              # Playwright: startsida renderar, input, snurra
│       │   ├── SpinResultPageTests.cs        # Playwright: resultat-URL → animation → resultat
│       │   └── ResponsiveTests.cs            # Playwright: desktop + mobil viewports
│       ├── Api/
│       │   ├── SpinEndpointTests.cs          # HttpClient: POST /api/spin happy path + fel
│       │   └── UrlRoundtripTests.cs          # HttpClient: API-url → browser-dekodning
│       └── SpinTheWheel.E2E.Tests.csproj
│
└── docs/
    ├── README.md                             # Projektdokumentation
    └── power-automate-setup.md               # Steg-för-steg PA-guide
```

---

## 3. URL-kodningsformat

### JSON-schema (kompakta nycklar för kort URL)

```json
{
  "i": ["Anna", "Bo", "Carl", "Diana", "Erik", "Fiona", "Gustav",
        "Hanna", "Isak", "Julia", "Karl", "Lisa"],
  "c": 4,
  "s": [0, 5, 3, 11],
  "r": 847291
}
```

| Nyckel | Typ | Beskrivning |
|---|---|---|
| `i` | `string[]` | Alla alternativ (items) |
| `c` | `int` | Antal att välja |
| `s` | `int[]` | Index i `i`-arrayen för de valda (ordningen = reveal-ordning) |
| `r` | `int` | Slumpseed — garanterar identisk animationssekvens vid replay |

### Encoding-pipeline

```
SpinState-objekt
  → System.Text.Json.JsonSerializer.SerializeToUtf8Bytes() (camelCase, korta nycklar)
  → Base64Url.EncodeToString() (RFC 4648 §5: A-Z a-z 0-9 - _ utan padding)
  → URL: /result/{base64url-sträng}
```

### Decoding (SpinResult-sidan)

```
URL-parameter (route: /result/{state})
  → Base64Url.DecodeFromString()
  → JsonSerializer.Deserialize<SpinState>()
  → Validera (index inom bounds, c == s.Length, inga duplicerade index)
  → Rendera hjul + animering
```

### URL-längdsbedömning

| Scenario | Items | Uppskattad JSON | Base64url | Total URL |
|---|---|---|---|---|
| 12 namn à 10 tecken | 12 | ~230 bytes | ~310 tecken | ~350 tecken |
| 20 namn à 15 tecken | 20 | ~450 bytes | ~600 tecken | ~640 tecken |
| 50 namn à 20 tecken | 50 | ~1400 bytes | ~1870 tecken | ~1910 tecken |

Alla inom 2000-teckengränsen. Vid >2000 tecken: visa varning i UI, föreslå att korta namnen.

### Pre-spin URL (valfri utökning)

```
/wheel/{base64url}    state = { "i": [...], "c": 2 }        (utan s och r)
/result/{base64url}   state = { "i": [...], "c": 2, "s": [0,3], "r": 42 }
```

`/wheel/`-URL:en delar ett hjul som inte snurrats ännu — mottagaren kan snurra själv. Implementeras som v2-feature.

---

## 4. Blazor-sidor & komponenter

### Sida: `Home.razor` (route: `/`)

| Zon | Innehåll |
|---|---|
| Hero | Rubrik "🎡 Spin the Wheel", kort beskrivning |
| ItemEditor | Textfält + "Lägg till"-knapp. Lista med items (drag-to-reorder valfritt). Ta-bort-knapp per item. Starta med 2 tomma fält |
| Inställningar | Dropdown/number input: "Hur många ska väljas?" (1–N, default 1) |
| Snurra-knapp | Stor CTA: "🎰 Snurra!" — disabled om <2 items eller count > items |
| Preview | Litet statiskt hjul som uppdateras live när items läggs till (ger direkt feedback) |

**Flöde vid klick "Snurra!":**
1. `SpinService.Spin(items, count)` → returnerar `SpinState` (med selected + seed)
2. `StateEncoder.Encode(state)` → base64url-sträng
3. `NavigationManager.NavigateTo($"/result/{encoded}")` → navigerar till resultatsidan

### Sida: `SpinResult.razor` (route: `/result/{State}`)

| Zon | Innehåll |
|---|---|
| Hjul | `<WheelSvg>` — full storlek, animeras automatiskt vid sidladdning |
| Status | Text under hjulet: "Snurrar..." → "Resultat!" (ändras vid animationens slut) |
| ResultPanel | Visas efter animationen: lista med de valda, numrerade, med emojis |
| ShareLink | "📋 Kopiera länk" → kopierar nuvarande URL till clipboard |
| Knappar | "🔄 Snurra igen" (ny slumpning med samma items) · "✏️ Ändra alternativ" (tillbaka till /) |
| Skip-länk | "⏭️ Hoppa till resultat" — för otåliga, scrollar ner och visar direkt |

**Felhantering vid ogiltig state:** Visa vänlig felsida: "Hmm, den här länken verkar trasig. Skapa ett nytt hjul →"

### Komponent: `WheelSvg.razor`

Hjärtkomponenten. Renderar ett SVG-baserat hjul med animerad rotation.

**Parametrar:**
- `Items` (`string[]`) — alla alternativ
- `SelectedIndices` (`int[]`) — vilka som valdes
- `Seed` (`int`) — för reproducerbar animation
- `AutoPlay` (`bool`) — starta animation direkt
- `OnSpinComplete` (`EventCallback`) — callback när animationen är klar

**SVG-struktur:**
```
<svg viewBox="0 0 500 500">
  <g class="wheel-group" style="transform: rotate({angle}deg)">
    <!-- N st arc-segment (path + text) -->
    <path d="M... A..." fill="{color[i]}" />
    <text transform="rotate(...) translate(...)">Namn</text>
    ...
  </g>
  <polygon points="..." class="pointer" />  <!-- Fast pil överst -->
</svg>
```

**Segmentfärger:** Fördefinierad palett med 6–8 färger som cyklar. Hög kontrast, tillgängliga färgval.

### Komponent: `ItemEditor.razor`

- Renderar en lista med `<input>` fält
- "Tab" i sista fältet lägger till nytt
- Stöd för paste av flera rader (tab-/newline-separerade) → bulk-add
- Validering: minst 2 items, inga tomma strängar

### Komponent: `ResultPanel.razor`

- Numrerad lista med valda items
- Staggerd "fade-in" animation (CSS `animation-delay` per item)
- Visar emojis: 🥇🥈🥉🎯 (eller konfigurerbart)

### Komponent: `ShareLink.razor`

- Knapp: "📋 Kopiera länk"
- JS interop → `navigator.clipboard.writeText(url)`
- Visuell feedback: knapptext ändras till "✅ Kopierad!" i 2 sekunder
- Fallback för äldre browsers: selektera text i ett readonly-fält

---

## 5. Animation — SVG + CSS transitions

### Vald approach: CSS `transition` på SVG `transform: rotate()`

**Varför inte alternativen?**

| Alternativ | Bedömning |
|---|---|
| **SVG + CSS transition** | ✅ Enklast, bäst prestanda (GPU-accelererat), inget JS behövs för själva animationen |
| Canvas via JS interop | Kraftfullt men kräver mycket JS-kod, tappar Blazor-fördelen |
| Blazor Canvas-bibliotek (Excubo etc.) | Omoget ekosystem, prestandaproblem i WASM |
| CSS `@keyframes` animation | Fungerar men `transition` ger mer kontroll med dynamiska målvinklar |
| Web Animations API (JS) | Bra men kräver JS interop, onödigt för rotation |

### Animationsmekanik

**Steg 1 — Beräkna målvinkel (C#, i `WheelSvg.razor`):**
```
segmentAngle = 360.0 / items.Length
targetOffset = segmentAngle * selectedIndex + segmentAngle / 2   // mitt i segmentet
finalAngle = (fullSpins * 360) + (360 - targetOffset)            // 5 fulla varv + offset
```
- `fullSpins` = 5 (tillräckligt för att se snurrande)
- `selectedIndex` = index för det **sista** valda alternativet (det hjulet "landar" på)
- `seed` används för att variera `fullSpins` med ±0.5 varv (visuell variation)

**Steg 2 — Applicera CSS transition:**
```css
.wheel-group {
    transition: transform 4s cubic-bezier(0.15, 0.60, 0.15, 1.0);
    transform-origin: 250px 250px;  /* centrum */
}
.wheel-group.spinning {
    transform: rotate(2160deg);  /* sätts dynamiskt via style-attribut */
}
```

**Steg 3 — Trigger (Blazor):**
1. Sidan renderar hjulet i startposition (rotate 0)
2. Efter kort delay (`Task.Delay(100)` — krävs för att CSS transition ska trigga): sätt `isSpinning = true`
3. CSS class ändras → transition startar → hjulet snurrar med avtagande hastighet
4. `transitionend`-event (JS interop) → `OnSpinComplete` callback → visa resultat

### Multipla val (count > 1)

**Approach: En spin + sekventiell reveal**

1. Hjulet spinner en gång (~4 sekunder) — landar på det "sista" valda alternativet
2. Efter att hjulet stannat: de valda segmenten highlightas ett i taget (0.5s per reveal)
3. Highlight-effekt: segmentfärgen pulserar (CSS `@keyframes pulse`) + texten blir bold/vit
4. Alternativen "dras ut" med en staggerd animation i `ResultPanel` nedanför hjulet samtidigt

**Sekventiella spins** (en spin per val) kan vara ett framtida "dramatic mode" men är överkill för v1.

### CSS-animationer att definiera

| Animation | Typ | Detaljer |
|---|---|---|
| Hjulrotation | `transition` | `transform 4s cubic-bezier(0.15, 0.60, 0.15, 1.0)` |
| Segment-highlight | `@keyframes` | Pulserar opacity/saturation, 0.5s |
| Resultat-item reveal | `@keyframes` | Fade-in + slide-up, staggerd med `animation-delay` |
| Kopiera-feedback | `@keyframes` | Fade in/out av "✅ Kopierad!" |
| Konfetti (valfritt) | `@keyframes` | CSS-only konfetti med `::before`/`::after` pseudo-elements |

### JS Interop (minimalt) — `wheel-interop.js`

Bara två funktioner behövs:
1. **`copyToClipboard(text)`** — `navigator.clipboard.writeText()`
2. **`onTransitionEnd(elementId, dotnetObjRef, methodName)`** — lyssna på `transitionend` och anropa Blazor-callback

All rendering sker i Blazor/SVG/CSS — inget JS för drawing.

---

## 6. Azure Function API

### Endpoint: `POST /api/spin`

**Request:**
```json
{
  "items": ["Anna", "Bo", "Carl", "Diana", "Erik", "Fiona",
            "Gustav", "Hanna", "Isak", "Julia", "Karl", "Lisa"],
  "count": 4
}
```

**Response (200 OK):**
```json
{
  "selected": ["Anna", "Fiona", "Diana", "Lisa"],
  "url": "https://<app>.azurestaticapps.net/result/eyJpIjpbIkFubmEi..."
}
```

**Felresponser:**

| HTTP Status | Scenario | Body |
|---|---|---|
| 400 | `items` saknas, tom, eller <2 element | `{ "error": "At least 2 items are required" }` |
| 400 | `count` < 1 eller > items.Length | `{ "error": "Count must be between 1 and {items.Length}" }` |
| 400 | Request body saknas/malformed JSON | `{ "error": "Invalid request body" }` |

### Funktionens interna flöde

```
1. Deserialisera request → SpinRequest
2. Validera via SpinValidator (samma logik som client)
3. WheelSpinner.Spin(items, count) → SpinState (med selected indices + generated seed)
4. StateEncoder.Encode(state) → base64url-sträng
5. Bygg URL: $"{baseUrl}/result/{encoded}"
6. Returnera SpinResponse { Selected, Url }
```

`baseUrl` hämtas från environment variable `SITE_URL` (sätts i SWA application settings) eller `HttpContext.Request`-headers.

### Teknisk implementation

- **Azure Functions isolated worker model** (.NET 10)
- En enda funktion-klass med `[Function("Spin")]` + `[HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "spin")]`
- Refererar till `SpinTheWheel.Shared` för all logik
- `host.json`: extensionBundle version 4.x

### Begränsning: SWA managed functions

Azure Static Web Apps managed functions har begränsningar:
- Bara HTTP triggers (OK — vi behöver bara en)
- Max 2 route-prefix (`/api` är default och fast)
- Cold start kan ta ~2–5 sekunder (acceptabelt för Power Automate)

### ⚠️ .NET 10-kompatibilitet

Azure Functions isolated worker model kör som en separat .NET-process, vilket i princip stöder vilken .NET-version som helst. **Men** SWA managed functions-runtime kan ha restriktioner.

**Fallback-plan om .NET 10 inte stöds i SWA managed functions:**
1. Api-projektet targets `net9.0` istället
2. Shared-projektet multi-targets: `<TargetFrameworks>net10.0;net9.0</TargetFrameworks>`
3. Client-projektet förblir `net10.0`

---

## 7. Deployment — Azure Static Web Apps

### Förutsättningar

1. Azure-konto (Free tier räcker)
2. GitHub-repo (SWA bygger via GitHub Actions)
3. Azure CLI eller Azure Portal för initial setup

### Steg-för-steg deploy

**A. Skapa SWA-resursen (en gång):**
1. Azure Portal → Create Resource → Static Web App
2. Plan: **Free**
3. Source: GitHub → välj repo och branch
4. Build preset: **Blazor**
5. App location: `src/SpinTheWheel.Client`
6. Api location: `src/SpinTheWheel.Api`
7. Output location: `wwwroot`

**B. GitHub Actions-workflow (genereras automatiskt, ska konfigureras):**

Filen `.github/workflows/azure-static-web-apps.yml` — nyckelvärden:
- `app_location: "src/SpinTheWheel.Client"`
- `api_location: "src/SpinTheWheel.Api"`
- `output_location: "wwwroot"`
- Lägg till .NET 10 SDK-setup-steg om actions-imagen inte har det

**C. `staticwebapp.config.json` (placeras i `wwwroot/`):**
```json
{
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/api/*", "/_framework/*", "/css/*", "/js/*", "*.{css,js,png,ico,woff,woff2}"]
  },
  "routes": [
    {
      "route": "/api/*",
      "allowedRoles": ["anonymous"]
    }
  ],
  "responseOverrides": {
    "404": {
      "rewrite": "/index.html",
      "statusCode": 200
    }
  }
}
```

**D. Lokal utvecklingsmiljö (detaljerat)**

Hela stacken körs lokalt utan Azure-konto. SWA CLI agerar proxy och knyter ihop Blazor-devserver + Azure Functions till en enda URL (`http://localhost:4280`) — exakt som i produktion.

**Förutsättningar (installera en gång):**
1. Azure Functions Core Tools v4: `npm install -g azure-functions-core-tools@4`
2. SWA CLI: `npm install -g @azure/static-web-apps-cli` (eller kör via `npx`)
3. Playwright browsers (för E2E-tester): `pwsh bin/Debug/net10.0/playwright.ps1 install` (körs i E2E-testprojektet efter första build)

**Startordning — 3 terminaler:**

```
┌─────────────────────────────────────────────────────────────┐
│ Terminal 1 — Blazor WASM DevServer (hot reload)             │
│                                                             │
│  cd src/SpinTheWheel.Client                                 │
│  dotnet watch                                               │
│  → Lyssnar på http://localhost:5232 (eller annan port)      │
│  → Automatisk ombyggning vid filändringar i Client + Shared │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Terminal 2 — Azure Functions (API)                           │
│                                                             │
│  cd src/SpinTheWheel.Api                                    │
│  func start --port 7071                                     │
│  → Lyssnar på http://localhost:7071                         │
│  → Omstart manuellt vid API-ändringar (func stöder ej watch)│
│    Alternativ: dotnet watch -- host start --port 7071       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Terminal 3 — SWA CLI (proxy som knyter ihop allt)           │
│                                                             │
│  swa start http://localhost:5232                            │
│      --api-devserver-url http://localhost:7071               │
│      --port 4280                                            │
│  → Öppna http://localhost:4280 i webbläsaren                │
│  → Client-anrop till /api/* proxyas till Functions           │
│  → Simulerar SWA-routing (fallback, config)                 │
└─────────────────────────────────────────────────────────────┘
```

**Snabbkommando (PowerShell, kör alla tre parallellt):**
```
# Skapa ett script: dev-start.ps1
Start-Process pwsh -ArgumentList '-c "cd src/SpinTheWheel.Client; dotnet watch"'
Start-Process pwsh -ArgumentList '-c "cd src/SpinTheWheel.Api; func start --port 7071"'
Start-Sleep -Seconds 5  # Vänta på att devservers startar
swa start http://localhost:5232 --api-devserver-url http://localhost:7071 --port 4280
```

**Iterativt arbetsflöde:**

| Ändring | Vad händer | Åtgärd |
|---|---|---|
| `.razor` / `.css` i Client | `dotnet watch` bygger om → browser laddar om | Automatiskt |
| `.cs` i Shared | `dotnet watch` bygger om (Client refererar Shared) | Automatiskt |
| `.cs` i Api (SpinFunction) | Kräver omstart av `func start` | Ctrl+C → `func start` igen |
| `staticwebapp.config.json` | Kräver omstart av `swa start` | Ctrl+C → `swa start` igen |

**Verifiera API lokalt (utan browser):**
```
curl -X POST http://localhost:4280/api/spin -H "Content-Type: application/json" -d '{"items":["A","B","C","D"],"count":2}'
```

**Kända gotchas:**
- `dotnet watch` för Blazor WASM lyssnar på port 5232 som default — kontrollera output och anpassa SWA CLI-flaggorna om porten skiljer
- SWA CLI:s `--devserver-timeout` (default 60s) kan behöva ökas om WASM-build tar lång tid första gången
- `func start` kräver en `local.settings.json` med `"FUNCTIONS_WORKER_RUNTIME": "dotnet-isolated"` och `"SITE_URL": "http://localhost:4280"`

> **OBS:** Azure Functions Core Tools måste installeras: `npm install -g azure-functions-core-tools@4`

### Custom domain (valfritt, framtida)

SWA Free tier stöder custom domains med automatiskt TLS-certifikat.

---

## 8. Power Automate-flöde (steg-för-steg)

### Översikt

```
[Recurrence: Mån 07:00] → [HTTP POST /api/spin] → [Parse JSON]
  → [Post Adaptive Card i Teams-kanal]
```

### Detaljerade steg

**Steg 1 — Trigger: Recurrence**
- Frequency: Week
- Interval: 1
- On these days: Monday
- At these hours: 7
- At these minutes: 0
- Time zone: (W. Europe Standard Time)

**Steg 2 — HTTP-action**
- Method: POST
- URI: `https://<app-name>.azurestaticapps.net/api/spin`
- Headers: `Content-Type: application/json`
- Body:
```json
{
  "items": ["Anna Andersson", "Bo Berg", "Carl Carlsson", "Diana Dahl",
            "Erik Eriksson", "Fiona Falk", "Gustav Gran", "Hanna Holm",
            "Isak Isaksson", "Julia Jonsson", "Karl Kraft", "Lisa Lund"],
  "count": 4
}
```

> **Observera:** Teamlistan definieras här i Power Automate — inte i appen. Enkel att ändra utan deploy. Framtidssäkring för IsAvailable: filtrera listan i PA före anropet (t.ex. läs frånvarolista från SharePoint).

**Steg 3 — Parse JSON**
- Content: `@body('HTTP')`
- Schema:
```json
{
  "type": "object",
  "properties": {
    "selected": { "type": "array", "items": { "type": "string" } },
    "url": { "type": "string" }
  }
}
```

**Steg 4 — Post Adaptive Card in a chat or channel**
- Team: [välj team]
- Channel: [välj kanal]
- Adaptive Card:

```json
{
  "type": "AdaptiveCard",
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "version": "1.5",
  "body": [
    {
      "type": "TextBlock",
      "text": "🎡 Support Wheel — Vecka @{formatDateTime(utcNow(), 'ww')}",
      "weight": "Bolder",
      "size": "Large",
      "wrap": true
    },
    {
      "type": "TextBlock",
      "text": "Denna veckas supporthjältar:",
      "spacing": "Medium",
      "weight": "Bolder"
    },
    {
      "type": "FactSet",
      "facts": [
        { "title": "🦸 1.", "value": "@{body('Parse_JSON')?['selected'][0]}" },
        { "title": "🦸 2.", "value": "@{body('Parse_JSON')?['selected'][1]}" },
        { "title": "🦸 3.", "value": "@{body('Parse_JSON')?['selected'][2]}" },
        { "title": "🦸 4.", "value": "@{body('Parse_JSON')?['selected'][3]}" }
      ]
    },
    {
      "type": "TextBlock",
      "text": "Lycka till! 💪",
      "horizontalAlignment": "Center",
      "spacing": "Large",
      "size": "Medium"
    }
  ],
  "actions": [
    {
      "type": "Action.OpenUrl",
      "title": "🎡 Se hjulet snurra!",
      "url": "@{body('Parse_JSON')?['url']}"
    }
  ]
}
```

### Felhantering i Power Automate

- **Configure run after** på HTTP-steget → vid misslyckande → skicka notifikation till admin/kanal
- Alternativt: **Scope** med try/catch-mönster (Scope → Actions, Scope → Failure handler)

---

## 9. NuGet-paket

### `SpinTheWheel.Client.csproj`

| Paket | Version | Syfte |
|---|---|---|
| `Microsoft.AspNetCore.Components.WebAssembly` | 10.0.x | Blazor WASM runtime (implicit via SDK) |
| `Microsoft.AspNetCore.Components.WebAssembly.DevServer` | 10.0.x | Dev server (bara Development, implicit via SDK) |

> Inga extra NuGet-paket krävs för Client. Blazor WASM SDK har allt inbyggt.

### `SpinTheWheel.Api.csproj`

| Paket | Version | Syfte |
|---|---|---|
| `Microsoft.Azure.Functions.Worker` | 2.52.0 | Isolated worker runtime |
| `Microsoft.Azure.Functions.Worker.Extensions.Http` | 3.3.0 | HTTP trigger-bindings |
| `Microsoft.Azure.Functions.Worker.Extensions.Http.AspNetCore` | 2.1.0 | ASP.NET Core-integration (model binding) |
| `Microsoft.Azure.Functions.Worker.Sdk` | 2.0.7 | Build/tooling SDK |

### `SpinTheWheel.Shared.csproj`

> Inga NuGet-paket. Bara `System.Text.Json` och `System.Security.Cryptography` som ingår i runtime.

### Testprojekt (unit + bUnit)

| Paket | Version | Syfte |
|---|---|---|
| `xunit` | 2.9.x | Testramverk |
| `xunit.runner.visualstudio` | 3.x | VS Test runner |
| `Microsoft.NET.Test.Sdk` | 17.x | Test host |
| `bunit` | 2.7.2 | Blazor component testing (Client.Tests) |
| `FluentAssertions` | 8.x | Läsbara assertions |
| `NSubstitute` | 5.3.x | Mocking |

### `SpinTheWheel.E2E.Tests.csproj` (Playwright + HTTP-integration)

| Paket | Version | Syfte |
|---|---|---|
| `Microsoft.Playwright` | 1.59.0 | Browser-automatisering (Chromium, Firefox, WebKit) |
| `xunit` | 2.9.x | Testramverk (samma som övriga testprojekt) |
| `xunit.runner.visualstudio` | 3.x | VS Test runner |
| `Microsoft.NET.Test.Sdk` | 17.x | Test host |
| `FluentAssertions` | 8.x | Läsbara assertions |

> **Notering:** `Microsoft.Playwright.TestAdapter` är NUnit-baserat. Vi använder `Microsoft.Playwright` direkt med xUnit och egna fixtures för browser-livscykel. Inga ytterligare paket behövs — `HttpClient` ingår i runtime.

---

## 10. csproj-konfiguration — viktiga detaljer

### `SpinTheWheel.Client.csproj`
- SDK: `Microsoft.NET.Sdk.BlazorWebAssembly`
- TargetFramework: `net10.0`
- ProjectReference: `SpinTheWheel.Shared`

### `SpinTheWheel.Api.csproj`
- SDK: `Microsoft.NET.Sdk`
- TargetFramework: `net10.0`
- AzureFunctionsVersion: `v4`
- OutputType: `Exe`
- ProjectReference: `SpinTheWheel.Shared`
- NuGet-paket enligt sektion 9

### `SpinTheWheel.Shared.csproj`
- SDK: `Microsoft.NET.Sdk`
- TargetFramework: `net10.0`
- Inga externa beroenden

> **Fallback:** Om SWA managed functions inte stöder .NET 10 — ändra Api + Shared till `net9.0` (eller Shared multi-targets `net10.0;net9.0`).

---

## 10b. Teststrategi

### Översikt — tre testnivåer

```
┌────────────────────────────────────────────────────────┐
│  Nivå 3: E2E / Playwright (browser)                    │
│  Kör mot SWA CLI (localhost:4280)                      │
│  Testar: UI-rendering, animation, navigation, responsiv│
│  Projekt: SpinTheWheel.E2E.Tests/Browser/              │
├────────────────────────────────────────────────────────┤
│  Nivå 2: HTTP-integration (API)                        │
│  Kör mot SWA CLI (localhost:4280/api)                  │
│  Testar: request/response, validering, URL-roundtrip   │
│  Projekt: SpinTheWheel.E2E.Tests/Api/                  │
├────────────────────────────────────────────────────────┤
│  Nivå 1: Unit + bUnit (ingen server)                   │
│  Kör isolerat, snabbast                                │
│  Testar: logik, encoding, validering, komponentrender  │
│  Projekt: Shared.Tests, Client.Tests, Api.Tests        │
└────────────────────────────────────────────────────────┘
```

### Nivå 1 — Enhetstester & bUnit (befintligt i planen)

Redan beskrivna i implementationsordningen. Körs med `dotnet test` utan extern infrastruktur.

| Testprojekt | Vad testas | Körtid |
|---|---|---|
| `Shared.Tests` | WheelSpinner, StateEncoder roundtrip, SpinValidator | <1s |
| `Client.Tests` | bUnit: WheelSvg renderar N segment, Home-sida, SpinResult dekodning/felvy | <3s |
| `Api.Tests` | SpinFunction enhetstester (mocka deps, anropa direkt) | <1s |

### Nivå 2 — HTTP-integrationstester (API mot SWA CLI)

**Förutsättning:** SWA CLI kör på `localhost:4280` (se sektion 7D).

**Fil:** `SpinTheWheel.E2E.Tests/Api/SpinEndpointTests.cs`

| Test | Metod | Vad verifieras |
|---|---|---|
| Valid spin returnerar 200 + korrekt JSON | `POST /api/spin` med `{"items":["A","B","C","D"],"count":2}` | HTTP 200, response innehåller `selected` (2 items ur originallistan), `url` börjar med base-URL |
| Returnerad URL avkodar till rätt state | `POST /api/spin` → ta `url` → extrahera base64-del → dekoda → verifiera att SpinState matchar | `s.Length == count`, alla index giltiga, `i` == original items |
| Tomt items-array → 400 | `POST /api/spin` med `{"items":[],"count":1}` | HTTP 400, felmeddelande i body |
| Count > antal items → 400 | `POST /api/spin` med `{"items":["A","B"],"count":5}` | HTTP 400, felmeddelande |
| Count = 0 → 400 | `POST /api/spin` med `{"items":["A","B"],"count":0}` | HTTP 400 |
| Negativt count → 400 | `POST /api/spin` med `{"items":["A","B"],"count":-1}` | HTTP 400 |
| Saknad body → 400 | `POST /api/spin` med tom body | HTTP 400 |
| Malformed JSON → 400 | `POST /api/spin` med `"not json"` | HTTP 400 |
| Specialtecken (åäö, emojis) | `POST /api/spin` med `{"items":["Åsa","Björn 🎉"],"count":1}` | HTTP 200, selected innehåller korrekt Unicode-sträng |

**Fil:** `SpinTheWheel.E2E.Tests/Api/UrlRoundtripTests.cs`

| Test | Vad verifieras |
|---|---|
| API → URL → dekoda → matchning | API:t genererar URL, testet dekoderar base64url-delen, verifierar att SpinState.i == original items och SpinState.s pekar på rätt valda |
| URL navigerbar | API → URL → Playwright navigerar till URL → sidan renderar utan fel (kopplar nivå 2 och 3) |

### Nivå 3 — Playwright-tester (browser-automation)

**Förutsättning:** SWA CLI kör på `localhost:4280` + Playwright browsers installerade.

**Fil:** `SpinTheWheel.E2E.Tests/Browser/HomePageTests.cs`

| Test | Playwright-steg | Assertion |
|---|---|---|
| Startsidan renderar | Navigera till `/` | Rubrik "Spin the Wheel" synlig, ItemEditor synlig |
| Lägg till items | Skriv "Pasta" i första fältet, "Tacos" i andra, lägg till "Sushi" | 3 items visas i listan |
| Snurra-knapp disabled med <2 items | Ta bort alla utom 1 item | Knappen "Snurra" har `disabled`-attribut |
| Snurra-knapp enabled med ≥2 items | Skriv 3 items | Knappen saknar `disabled`-attribut |
| Klick på Snurra navigerar | Skriv 3 items → klicka "Snurra" | URL ändras till `/result/{nånting}` |
| Count-väljare fungerar | Skriv 4 items, välj count=2 | Dropdown/input visar 2 |

**Fil:** `SpinTheWheel.E2E.Tests/Browser/SpinResultPageTests.cs`

| Test | Playwright-steg | Assertion |
|---|---|---|
| Kodad URL renderar hjul | Navigera till `/result/{giltig base64url}` (hårdkodad testdata) | SVG-element med class `wheel-group` finns i DOM |
| Animation startar | Navigera → vänta | Element med class `spinning` finns (CSS transition aktiv) |
| Animation slutar → resultat visas | Navigera → vänta `transitionend` (max 6s timeout) | ResultPanel syns med rätt antal valda items |
| Resultaten matchar state i URL | Navigera med känd state (items=["A","B","C"], s=[1]) | ResultPanel visar "B" |
| Ogiltig URL visar felsida | Navigera till `/result/!!invalid!!` | Felmeddelande visas, länk till startsidan finns |
| Dela-knapp kopierar URL | Klicka "Kopiera länk" | Knapptext ändras till "Kopierad!" (alt: verifiera clipboard om möjligt) |
| "Snurra igen" navigerar | Klicka "Snurra igen" | URL ändras till ny `/result/...` (annan base64-sträng) |

**Fil:** `SpinTheWheel.E2E.Tests/Browser/ResponsiveTests.cs`

| Test | Viewport | Assertion |
|---|---|---|
| Desktop-layout | 1280×800 | Hjulet har `width >= 400px`, layout är inte bruten |
| Mobil-layout | 375×667 (iPhone SE) | Hjulet skalas ned, alla knappar synliga, ingen horisontell scroll |
| Tablet-layout | 768×1024 (iPad) | Layout fungerande, inga överlappande element |

### Infrastructure — test fixtures

**`SwaFixture.cs` (xUnit `IAsyncLifetime` / Collection Fixture):**
- **Syfte:** Starta SWA CLI-processen före testkörning, stoppa efter
- **Flöde:**
  1. `InitializeAsync()`: Bygg Client + Api (`dotnet build`), starta `swa start` med `--output-location` (pekar på byggd output, inte devserver — snabbare för CI)
  2. Vänta tills `http://localhost:4280` svarar (poll med HttpClient, timeout 60s)
  3. Exponera `BaseUrl` property → `http://localhost:4280`
  4. `DisposeAsync()`: Kill SWA CLI-processen

- **Alternativ approach för utveckling**: Kör SWA CLI manuellt (3 terminaler, se sektion 7D) och kör testerna med en environment variable `SWA_BASE_URL=http://localhost:4280` redan satt. Fixture skippar start/stop om variabeln finns.

**`PlaywrightFixture.cs` (xUnit Collection Fixture):**
- **Syfte:** Skapa en Playwright-instans och browser en gång per testkörning
- **Flöde:**
  1. `InitializeAsync()`: `Playwright.CreateAsync()` → `playwright.Chromium.LaunchAsync(new() { Headless = true })`
  2. Exponera `Browser` property
  3. Varje test skapar en ny `BrowserContext` och `Page` (isolering)
  4. `DisposeAsync()`: Stäng browser + Playwright

**Testisolering:** Varje testmetod skapar en ny `BrowserContext` (som ett inkognito-fönster) → inga cookies/state läcker mellan tester.

### Köra testerna

**Lokalt (utveckling):**
```
# Steg 1: Starta SWA CLI manuellt (se sektion 7D) — eller låt fixture göra det
# Steg 2: Unit/bUnit-tester (snabbt, ingen infra)
dotnet test tests/SpinTheWheel.Shared.Tests
dotnet test tests/SpinTheWheel.Client.Tests
dotnet test tests/SpinTheWheel.Api.Tests

# Steg 3: E2E-tester (kräver SWA CLI)
$env:SWA_BASE_URL = "http://localhost:4280"
dotnet test tests/SpinTheWheel.E2E.Tests
```

**CI (GitHub Actions):**
```
1. dotnet build (hela lösningen)
2. dotnet test --filter "FullyQualifiedName!~E2E" (unit + bUnit först, snabbt)
3. Installera Playwright browsers: pwsh .playwright/install.ps1
4. Starta SWA CLI i bakgrunden (bygg-output-läge, ingen devserver)
5. dotnet test --filter "FullyQualifiedName~E2E" (Playwright + HTTP-tester)
6. Stoppa SWA CLI
```

### Kategorisering med xUnit Traits

Använd `[Trait("Category", "...")]` för att filtrera:
- `[Trait("Category", "Unit")]` — Shared.Tests, Api.Tests
- `[Trait("Category", "Component")]` — Client.Tests (bUnit)
- `[Trait("Category", "E2E")]` — E2E.Tests (Playwright + HTTP)
- `[Trait("Category", "API")]` — E2E.Tests/Api/ (HTTP-tester enbart)

Filtrera: `dotnet test --filter "Category=Unit|Category=Component"` (snabb loop) eller `dotnet test --filter "Category=E2E"` (fullständig verifiering).

---

## 11. Implementationsordning

### Steg 1: Scaffolding & Shared-logik
- **Filer:** `SpinTheWheel.sln`, alla 3 `.csproj`, `SpinState.cs`, `SpinRequest.cs`, `SpinResponse.cs`, `IWheelSpinner.cs`, `WheelSpinner.cs`, `StateEncoder.cs`, `SpinValidator.cs`
- **Mål:** Delad logik som kompilerar och testas. Slumpning (Fisher-Yates shuffle med `Random(seed)`), encode/decode roundtrip, validering.
- **Beroenden:** Inga
- **Tester:** `WheelSpinnerTests.cs`, `StateEncoderTests.cs`, `SpinValidatorTests.cs`

### Steg 2: Blazor WASM — grundstruktur
- **Filer:** `Program.cs`, `_Imports.razor`, `MainLayout.razor`, `index.html`, `app.css`, `staticwebapp.config.json`
- **Mål:** Körbar Blazor WASM-app med layout och routing. Visar tom startsida.
- **Beroenden:** Steg 1

### Steg 3: Hjulkomponent (WheelSvg)
- **Filer:** `WheelSvg.razor`, `WheelSvg.razor.css`, `wheel-interop.js`
- **Mål:** SVG-hjul renderas med korrekta segment och namn. CSS-animation för spinning. JS interop för `transitionend`-callback.
- **Beroenden:** Steg 2
- **Referens:** Testa med hårdkodad data först, koppla dynamiskt i Steg 5
- **Tester:** `WheelSvgTests.cs` (bUnit: verifierar att N segment renderas)

### Steg 4: ItemEditor-komponent
- **Filer:** `ItemEditor.razor`, `ItemEditor.razor.css`
- **Mål:** Lägg till/ta bort items. Paste-stöd för bulk-import. Validering (min 2).
- **Beroenden:** Steg 2

### Steg 5: Home-sida (ad-hoc spin)
- **Filer:** `Home.razor`, `Home.razor.css`, `SpinService.cs`, `UrlStateService.cs`
- **Mål:** Komplett Läge A-flöde: skriv items → välj count → snurra → navigera till resultat
- **Beroenden:** Steg 3, Steg 4

### Steg 6: SpinResult-sida
- **Filer:** `SpinResult.razor`, `SpinResult.razor.css`, `ResultPanel.razor`, `ResultPanel.razor.css`, `ShareLink.razor`
- **Mål:** Dekoda URL-state → visa animerat hjul → visa resultat → dela-knapp
- **Beroenden:** Steg 3, Steg 5
- **Tester:** `SpinResultTests.cs` (bUnit: verifierar dekodning, felvy vid ogiltig state)

### Steg 7: Azure Function API
- **Filer:** `SpinFunction.cs`, `Program.cs` (Api), `host.json`, `local.settings.json`
- **Mål:** `POST /api/spin` returnerar korrekt JSON. Testat lokalt via SWA CLI + curl (se sektion 7D).
- **Beroenden:** Steg 1 (Shared-logik)
- **Tester:** `SpinFunctionTests.cs` (enhetstester med mockade dependencies)
- **Verifiering:** `curl -X POST http://localhost:4280/api/spin -H "Content-Type: application/json" -d '{"items":["A","B","C","D"],"count":2}'` → 200 OK

### Steg 8: E2E-testinfrastruktur & API-integrationstester
- **Filer:** `SpinTheWheel.E2E.Tests.csproj`, `SwaFixture.cs`, `PlaywrightFixture.cs`, `SpinEndpointTests.cs`, `UrlRoundtripTests.cs`
- **Mål:** HTTP-integrationstester mot körande SWA CLI. Verifierar hela API-pipeline: request → validering → slumpning → URL-kodning → response. Alla 9 testfall i sektion 10b (nivå 2) ska vara gröna.
- **Beroenden:** Steg 6 (client), Steg 7 (API) — båda måste fungera i SWA CLI
- **Installera:** `npm install -g azure-functions-core-tools@4` (om ej gjort), kör Playwright install

### Steg 9: Playwright browser-tester
- **Filer:** `HomePageTests.cs`, `SpinResultPageTests.cs`, `ResponsiveTests.cs`
- **Mål:** Alla browser-tester i sektion 10b (nivå 3) ska vara gröna. Verifierar: startsida renderar, items kan skrivas in, hjulet spinner, resultat visas, delad URL fungerar, responsivt beteende.
- **Beroenden:** Steg 8 (fixture-infrastruktur)
- **Kör:** `dotnet test tests/SpinTheWheel.E2E.Tests --filter "Category=E2E"`

### Steg 10: Deployment pipeline
- **Filer:** `.github/workflows/azure-static-web-apps.yml`
- **Mål:** Push till `main` → automatisk deploy till Azure SWA. Pipeline inkluderar: build → unit/bUnit-tester → deploy → (valfritt: E2E mot staging).
- **Beroenden:** Steg 9

### Steg 11: Power Automate-flöde
- **Filer:** `docs/power-automate-setup.md`
- **Mål:** Dokumenterat PA-flöde som anropar API:t varje måndag och postar i Teams. Testat manuellt.
- **Beroenden:** Steg 10 (behöver deployad URL)

### Steg 12: Polish & edge cases
- **Filer:** Diverse (styling, felhantering, responsivitet)
- **Mål:** Mobilanpassning, tillgänglighet (ARIA-attribut), loading states, felmeddelanden, favicon, meta-tags (Open Graph för snygga link-previews)
- **Beroenden:** Steg 11

---

## 12. Delade resurser

Filer som berörs av flera steg — kräver konsekvent design tidigt:

| Resurs | Används av | Ägs av steg |
|---|---|---|
| `SpinState.cs` | Client (encode/decode), Api (skapa), WheelSvg (animera) | Steg 1 |
| `StateEncoder.cs` | Client (`UrlStateService`), Api (`SpinFunction`) | Steg 1 |
| `WheelSpinner.cs` | Client (`SpinService`), Api (`SpinFunction`) | Steg 1 |
| `SpinValidator.cs` | Client (input-validering), Api (request-validering) | Steg 1 |
| `staticwebapp.config.json` | Routing (Client + Api) | Steg 2, uppdateras i Steg 10 |
| `SwaFixture.cs` | Alla E2E-tester (browser + HTTP) | Steg 8 |
| `PlaywrightFixture.cs` | Alla Playwright browser-tester | Steg 8 |

---

## 13. Edge cases att hantera

| # | Scenario | Var | Hantering |
|---|---|---|---|
| 1 | Färre än 2 items | Client + API | `SpinValidator` returnerar fel. Client: disabled knapp + meddelande. API: HTTP 400. |
| 2 | `count` > items.Length | Client + API | Validering: "Kan inte välja fler än antal alternativ" |
| 3 | `count` = 0 eller negativt | Client + API | Validering: "Välj minst 1" |
| 4 | Ogiltig base64 i URL (`/result/!!!`) | Client | Try-catch i `StateEncoder.Decode()`. Visa vänlig felsida med länk till startsidan. |
| 5 | Giltig base64 men ogiltig JSON | Client | Samma som ovan — felsida |
| 6 | Selected index utanför bounds | Client | Validera efter dekodning: alla index i `s` måste vara < `i.Length` |
| 7 | Duplicerade index i `s` | Client | Validera: inga dubbletter tillåtna |
| 8 | `s.Length != c` | Client | Validera: antal valda måste matcha count |
| 9 | URL > 2000 tecken | Client | Visa varning vid skapande. Föreslå kortare namn. |
| 10 | Tomt namn (whitespace-only item) | Client + API | Trimma + filtrera bort tomma items innan spin |
| 11 | Specialtecken (åäö, emojis) | Hela kedjan | UTF-8 + base64url hanterar detta. Explicita tester. |
| 12 | Väldigt långt namn (50+ tecken) | Client (SVG) | Trunkera text i segmentet med ellipsis. Full text i ResultPanel. |
| 13 | Väldigt många items (100+) | Client (SVG) | Segmenten blir oläsligt små. Visa varning vid >30 items. |
| 14 | Långsam WASM-laddning | Client | Loading spinner i `index.html` (innan Blazor WASM initialiseras) |
| 15 | Power Automate HTTP timeout | API | PA default timeout 120s, vår function tar <1s. Inget problem. |
| 16 | API cold start | API | SWA managed functions: ~2-5s. PA tolererar detta. |
| 17 | CORS vid PA-anrop | API | SWA managed functions tillåter same-origin. PA anropar utifrån — verifiera CORS-config (kan behöva `"allowedOrigins": ["*"]` i config). |
| 18 | Browser stöder ej WASM | Client | Blazor WASM har inbyggd fallback-text i `index.html`. Sällsynt 2025. |
| 19 | Playwright browser ej installerad | E2E-tester | Tydligt felmeddelande: "Run `pwsh playwright.ps1 install`". Dokumentera i README. |
| 20 | SWA CLI inte startad vid E2E-test | E2E-tester | `SwaFixture` pollar `localhost:4280` med timeout 60s. Kastar `SkipException` om ej nåbar + env-var `SWA_BASE_URL` ej satt — testerna skippas istf. att faila. |
| 21 | Port 4280/7071/5232 redan upptagen | Lokal utveckling | SWA CLI och func start rapporterar "port in use". Dokumentera hur man ändrar portar i alla tre kommandona. |
| 22 | CSS-animation timing i Playwright | E2E-tester | `transitionend` kan ta 4+ sekunder. Använd `Page.WaitForSelectorAsync` med timeout 8s (dubbla animationstiden). |

---

## 14. Öppna frågor 🔴

### Blockerande

1. **Azure Functions .NET 10 i SWA managed**: Stöds .NET 10 i SWA managed functions idag? Om inte — Api-projektet targets `net9.0` och Shared multi-targets. **Påverkar Steg 1 och 7.** Fallback finns beskriven i sektion 10.

2. **CORS för Power Automate**: SWA managed functions tillåter same-origin automatiskt. Power Automate anropar från Microsofts IP-range (inte same-origin). Behövs explicit CORS i `staticwebapp.config.json`? **Undersök innan Steg 8.**

3. **Azure Functions Core Tools**: Inte installerade lokalt — krävs för lokal API-utveckling och E2E-tester. `npm install -g azure-functions-core-tools@4` **innan Steg 7.** Installationssteg beskrivna i sektion 7D.

### Icke-blockerande

4. **Veckonnummer i Adaptive Card**: `formatDateTime(utcNow(), 'ww')` i Power Automate — ger detta ISO 8601-veckor (som Sverige)? Eller US-standard? Verifiera i PA-dokumentation.

5. **Animationslängd**: 4 sekunder för en spin — lagom? Bör vara justerbar (CSS custom property). Testa med riktiga användare.

6. **Open Graph meta-tags**: När `/result/...`-URL delas i Teams/Slack → link preview? Blazor WASM renderas client-side, så sociala tjänster ser bara `index.html`. Lösning för v2: en Azure Function som serverar dynamiska `<meta>`-tags för `/result/*`-routes.

7. **GitHub-repo**: Publikt eller privat? SWA Free tier stöder båda. Privat kräver deploy-token vid SWA-skapande (hanteras automatiskt av Azure Portal).

8. **Tillgänglighet (a11y)**: SVG-hjulet behöver ARIA-attribut (`role="img"`, `aria-label`). Animationen bör respektera `prefers-reduced-motion` (CSS media query → skippa animation, visa resultat direkt).

9. **E2E-tester i CI**: Ska Playwright-tester köras i GitHub Actions pipeline? Kräver att SWA CLI startas i CI-miljön (bygg-output-läge, inte devserver). Playwright i CI kräver `--browser chromium` (inte alla tre). Överväg att bara köra E2E vid PR → main, inte vid varje push.

10. **Playwright headless vs headed**: I utveckling kan `Headless = false` vara värdefullt för debugging. Styr via environment variable `PLAYWRIGHT_HEADED=true`. Fixture ska respektera detta.

---

## 15. Framtida utökningar (utanför scope)

- **`/wheel/{state}` URL**: Dela ett hjul som inte spinnats — mottagaren snurrar själv
- **Dramatic mode**: Sekventiella spins (en per val) med paus och trumvirvel
- **Historik**: `localStorage` för senaste spins
- **Ljud**: "Tick-tick-tick" vid spinning (Web Audio API)
- **Tema/branding**: Anpassade färger, logotyp, bakgrundsbild per hjul
- **Fullscreen mode**: Presentationsvy för möten
- **PWA**: Offline-stöd (service worker, redan stöd i Blazor WASM-template)
- **Dark mode**: `prefers-color-scheme` → anpassa SVG-färger
- **QR-kod**: Generera QR till resultat-URL för storskärmar
- **SharePoint-lista som datakälla i PA**: Läs teamlista + tillgänglighet dynamiskt
