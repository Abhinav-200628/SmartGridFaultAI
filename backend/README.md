# SmartGridFaultAI - Backend Electrical Fault Simulation Engine (Stage 2)

AI-Based Smart Grid Fault Detection, Classification, Localization & Automatic Switching System  
**Final-Year Electrical and Electronics Engineering (EEE) Capstone Project**

---

> [!NOTE]
> **Stage 2 Methodology Notice:**  
> Stage 2 uses a physics-based electrical simulation and deterministic rule-based fault classification. Machine-learning-based classification and localization models will be integrated in a later stage. Real-world protection-system accuracy is neither fabricated nor claimed.

---

## 1. System Architecture
The electrical simulation models a balanced 3-phase AC power transmission system structured as follows:

```
[3-Phase AC Source] (500 MVA stiffness, 11 kV / 33 kV / 132 kV)
         │
         ▼
[Line Section 1] (Positive: z1 = r1 + jωl1, Zero: z0 = r0 + jωl0, length: d km)
         │
         ├──────► [Fault Inception Point] (Short-Circuit: Rf, Rg | Open-Circuit: Conductor break)
         │
[Line Section 2] (length: L - d km)
         │
         ▼
[Circuit Breakers CB1 & CB2] (Overcurrent relay pickup -> Trip coil -> Contact parting ~ 40ms)
         │
         ├──────► [Tie-Switch TS1] (FLISR Alternate Feeder / Microgrid Reconnection)
         │
         ▼
[3-Phase Load Bus] (P kW, cosφ power factor, balanced wye/delta load)
```

---

## 2. Healthy Three-Phase Electrical Model
The steady-state 3-phase balanced system operates with pure $120^\circ$ spatial displacement:
$$v_a(t) = \sqrt{2} V_{LN} \sin(\omega t)$$
$$v_b(t) = \sqrt{2} V_{LN} \sin(\omega t - 120^\circ)$$
$$v_c(t) = \sqrt{2} V_{LN} \sin(\omega t + 120^\circ)$$
where $V_{LN} = V_{LL, rms} / \sqrt{3}$ and $\omega = 2\pi f$.

Load current is calculated directly from active load $P$ and power factor $\cos\phi$:
$$I_{load, rms} = \frac{P}{\sqrt{3} \cdot V_{LL, rms} \cdot \cos\phi}, \quad \phi = \arccos(\text{PF})$$
$$i_a(t) = \sqrt{2} I_{load, rms} \sin(\omega t - \phi)$$
$$i_b(t) = \sqrt{2} I_{load, rms} \sin(\omega t - 120^\circ - \phi)$$
$$i_c(t) = \sqrt{2} I_{load, rms} \sin(\omega t + 120^\circ - \phi)$$

---

## 3. Short-Circuit Fault Models
Short circuits inject subtransient AC short-circuit currents along with an exponentially decaying DC offset component governed by the loop $X/R$ ratio:
$$i_{sc}(t) = I_{sc, peak} \sin(\omega t + \theta - \psi_{loop}) + I_{dc, 0} e^{-(t - t_0)/\tau}, \quad \tau = \frac{L_{loop}}{R_{loop}}$$

1. **Line-to-Ground (LG):** Connects selected phase (A, B, or C) to earth through fault resistance $R_f$ and ground grid resistance $R_g$. Faulted phase current surges; terminal voltage drops. Zero and negative sequences appear.
2. **Line-to-Line (LL):** Connects two phases (A-B, B-C, or C-A) through $R_f$. Currents in faulted pair are equal and opposite ($i_a \approx -i_b$). Severe negative sequence; zero sequence remains near zero.
3. **Double Line-to-Ground (LLG):** Connects two phases to earth through $R_f$. Both faulted phase currents surge with asymmetric phase shifts. Both zero and negative sequence components are active.
4. **Three-Phase Symmetrical (LLL):** Simultaneous bolted/impedance short circuit across all three phases. Symmetrical current surge on all phases; voltages collapse symmetrically; positive sequence dominates while $I_0$ and $I_2$ remain near zero.

---

## 4. Open-Circuit Fault Models
Open-circuit faults simulate series conductor breaks or load phase interruptions (NOT short circuits):
1. **PHASE_A_OPEN:** Phase A conductor broken; $i_a(t) \to 0$. Terminal voltage reflects open-line induced potential ($0.15 \times V_{norm}$). Current imbalance creates substantial negative sequence.
2. **PHASE_B_OPEN:** Conductor broken on Phase B; $i_b(t) \to 0$.
3. **PHASE_C_OPEN:** Conductor broken on Phase C; $i_c(t) \to 0$.
4. **THREE_PHASE_OPEN:** Complete interruption of three-phase feeder path; $i_a, i_b, i_c \to 0$.

---

## 5. Symmetrical Components Analysis (Fortescue Transformation)
The symmetrical sequence components are calculated via the Fortescue transformation matrix ($a = e^{j 120^\circ} = -0.5 + j\frac{\sqrt{3}}{2}$):
$$\begin{bmatrix} F_0 \\ F_1 \\ F_2 \end{bmatrix} = \frac{1}{3} \begin{bmatrix} 1 & 1 & 1 \\ 1 & a & a^2 \\ 1 & a^2 & a \end{bmatrix} \begin{bmatrix} F_a \\ F_b \\ F_c \end{bmatrix}$$
- **Positive Sequence ($V_1, I_1$):** Dominant in normal balanced conditions.
- **Negative Sequence ($V_2, I_2$):** Rises under any unbalance (LL, LLG, LG, Open Conductor).
- **Zero Sequence ($V_0, I_0$):** Rises only when ground path is involved (LG, LLG).

---

## 6. Deterministic Fault Detection Method
Fault detection is calculated from continuous discrete metrics during the simulation window:
- **Voltage Sag Index:** $\text{Sag}\% = (1 - V_{rms, min} / V_{norm}) \times 100\%$.
- **Current Surge Ratio:** $\text{Surge} = I_{rms, max} / I_{norm}$.
- **Phase Current Imbalance:** $\text{Imbalance} = (I_{max} - I_{min}) / I_{avg}$.
- **Short-Circuit Trigger:** $\text{Surge} > 1.35$ or ($\text{Sag}\% > 20\%$ and $\text{Surge} > 1.15$).
- **Open-Circuit Trigger:** $I_{rms, min} < 0.35 \times I_{norm}$ while system is energized.

---

## 7. Deterministic Baseline Classification Method
Classifies fault based on physical signatures:
- $\text{Imbalance} \approx 0, \text{Surge} \approx 1.0 \implies \mathbf{NORMAL}$
- $\text{Surge} > 1.35$:
  - 3 phases affected, $I_0/I_1 < 0.15 \implies \mathbf{LLL}$
  - 2 phases affected, $I_0/I_1 > 0.18 \implies \mathbf{LLG}$
  - 2 phases affected, $I_0/I_1 \le 0.18 \implies \mathbf{LL}$
  - 1 phase affected, $I_0/I_1 > 0.15 \implies \mathbf{LG}$
- Current interruption:
  - Phase A drop $\implies \mathbf{PHASE\_A\_OPEN}$
  - Phase B drop $\implies \mathbf{PHASE\_B\_OPEN}$
  - Phase C drop $\implies \mathbf{PHASE\_C\_OPEN}$
  - All 3 drop $\implies \mathbf{THREE\_PHASE\_OPEN}$

---

## 8. Fault Localization Method
Apparent impedance reactance method calculates distance from measured terminal quantities independently of input distance:
$$Z_{app} = \frac{V_{terminal, phase}}{I_{fault, phase}} = (r_1 \cdot d + R_f) + j (\omega l_1 \cdot d)$$
$$\hat{d} = \frac{\text{Im}(Z_{app})}{x_{1, per\_km}}$$
- **Distance Error (km):** $e_{km} = |\hat{d} - d_{actual}|$
- **Distance Error (%):** $e_{\%} = \frac{e_{km}}{L_{line}} \times 100\%$

---

## 9. Breaker & Protection Relay Logic
- **Normal state:** Breaker is `CLOSED`.
- **Fault detected:** Relay starts timer; trip signal issued at $t = t_{start} + 10\,\text{ms}$.
- **Breaker opening:** Breaker contacts part and arc is extinguished at $t = t_{start} + \text{protection\_delay\_ms}$.
- **Isolation:** Faulted section is isolated; line currents de-energize to zero.
- **Timeline Milestones:**
  1. `NORMAL_OPERATION` ($t = 0\,\text{ms}$)
  2. `FAULT_DETECTED` ($t \approx t_{start} + 5\,\text{ms}$)
  3. `TRIP_COMMAND` ($t \approx t_{start} + 10\,\text{ms}$)
  4. `BREAKER_OPENED` ($t = t_{start} + t_{delay}$)
  5. `FAULT_SECTION_ISOLATED` ($t = t_{start} + t_{delay} + 5\,\text{ms}$)
  6. `NETWORK_RECONFIGURATION` ($t = t_{start} + t_{delay} + 20\,\text{ms}$)

---

## 10. Automatic Switching & Reconfiguration (FLISR)
Backend state transitions:
$$\text{HEALTHY} \longrightarrow \text{FAULT\_DETECTED} \longrightarrow \text{ISOLATING} \longrightarrow \text{FAULT\_ISOLATED} \longrightarrow \text{RECONFIGURING} \longrightarrow \text{RESTORED}$$
When reconfigured, alternate tie-switch TS1 closes to restore healthy downstream loads.

---

## 11. API Request Examples

### Single Line-to-Ground Fault (`LG` on Phase A):
```json
POST /api/simulation/run
{
  "fault_category": "SHORT_CIRCUIT",
  "fault_type": "LG",
  "fault_phase": "A",
  "voltage_rms": 11000.0,
  "frequency": 50.0,
  "load_kw": 500.0,
  "power_factor": 0.85,
  "line_length_km": 50.0,
  "fault_distance_km": 35.0,
  "fault_resistance_ohm": 2.0,
  "fault_start_time": 0.04,
  "fault_duration": 0.06,
  "protection_delay_ms": 40.0
}
```

### Open-Circuit Conductor Break (`PHASE_A_OPEN`):
```json
POST /api/simulation/run
{
  "fault_category": "OPEN_CIRCUIT",
  "fault_type": "PHASE_A_OPEN",
  "voltage_rms": 11000.0,
  "line_length_km": 50.0,
  "fault_distance_km": 30.0,
  "fault_start_time": 0.04,
  "fault_duration": 0.06
}
```

---

## 12. Assumptions & Limitations
### Assumptions:
- Conductor series parameters are modeled using standard ACSR positive ($r_1, x_1$) and zero ($r_0, x_0$) sequence impedances.
- Ground return path resistance is assumed at $0.5\,\Omega$ substation earth grid resistance.
- Three-phase load is balanced inductive load.
- Short-circuit grid stiffness is modeled as 500 MVA equivalent source.

### Limitations:
- Mutual coupling from adjacent parallel transmission circuits on double-circuit towers is not modeled.
- Stage 2 uses a deterministic rule-based classifier; machine learning inference is scheduled for Stage 3.
