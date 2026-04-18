# Weaving API

## Overview

This API tracks the player's swing state and predicts whether a spell cast
will clip the next main-hand or off-hand swing.

## Reference

- Designed for weaving Lightning Bolt, Chain Lightning, Healing Wave,
  Lesser Healing Wave, and Chain Heal on Vanilla/TBC-era Shamans.
- Uses Vanilla/TBC spell IDs only. WotLK-only spells like Lava Burst and Hex
  are intentionally excluded from this TBC Classic path.
- Spell ranks are resolved once and cached, so the addon avoids repeated
  `GetSpellInfo` lookups during combat.
- Timing uses `GetTimePreciseSec()` as the high-precision clock when available, with `GetTime()` as fallback for older clients. Latency is refreshed on every prediction pass from `GetNetStats()`, preferring world latency and falling back to home/realm latency so the swing math does not sit on a half-second cache window.
- Spell haste is refreshed from `UnitSpellHaste("player")` on every prediction pass, so rating or aura changes sync automatically.
- This complements `SwingTimerAPI` via `aura_env.setSwingState(...)` and does
  not modify `swingtimer.md`.
- If Blizzard changes the rank tables in a future client, update the groups
  below to match the new spell IDs.

```lua
local weavingFrame = CreateFrame("Frame")

local WeavingAPI = {}

local GetClock = _G.GetTimePreciseSec or GetTime

-- Prime the precise clock so the first call does not return 0.
GetClock()

local math_max = math.max
local math_min = math.min

WeavingAPI.unitGUID = UnitGUID("player")
WeavingAPI.attackSpeed = {
    mainhand = 0,
    offhand = 0,
}

WeavingAPI.attackExpirationTime = {
    mainhand = 0,
    offhand = 0,
}

WeavingAPI.speed = 0
WeavingAPI.cachedLatency = 0
WeavingAPI.cachedRealmLatency = 0
WeavingAPI.cachedWorldLatency = 0
WeavingAPI.isCasting = false
WeavingAPI.spellCastTime = 0
WeavingAPI.spellExpirationTime = nil
WeavingAPI.currentSpellId = nil
WeavingAPI.spellCatalogDirty = true
WeavingAPI.trackedSpellCatalog = {}
WeavingAPI.trackedSpellLookup = {}

local cachedRealmLatency = 0
local cachedWorldLatency = 0
local cachedLatency = 0

WeavingAPI.spellIds = {
    [403] = true,
    [529] = true,
    [548] = true,
    [915] = true,
    [943] = true,
    [6041] = true,
    [10391] = true,
    [10392] = true,
    [15207] = true,
    [15208] = true,
    [25448] = true,
    [25449] = true,
    [421] = true,
    [930] = true,
    [2860] = true,
    [10605] = true,
    [25439] = true,
    [25442] = true,
    [331] = true,
    [332] = true,
    [547] = true,
    [913] = true,
    [939] = true,
    [959] = true,
    [8005] = true,
    [10395] = true,
    [10396] = true,
    [25357] = true,
    [25391] = true,
    [25396] = true,
    [8004] = true,
    [8008] = true,
    [8010] = true,
    [10466] = true,
    [10467] = true,
    [10468] = true,
    [25420] = true,
    [1064] = true,
    [10622] = true,
    [10623] = true,
    [25422] = true,
    [25423] = true,
}

local trackedSpellGroups = {
    {
        25449,
        25448,
        15208,
        15207,
        10392,
        10391,
        6041,
        943,
        915,
        548,
        529,
        403,
    },
    {
        25442,
        25439,
        10605,
        2860,
        930,
        421,
    },
    {
        25396,
        25391,
        25357,
        10396,
        10395,
        8005,
        959,
        939,
        913,
        547,
        332,
        331,
    },
    {
        25420,
        10468,
        10467,
        10466,
        8010,
        8008,
        8004,
    },
    {
        25423,
        25422,
        10623,
        10622,
        1064,
    },
}

local function scanEvent(event, ...)
    if WeakAuras and WeakAuras.ScanEvents then
        WeakAuras.ScanEvents(event, ...)
    end
end

local function UpdateLatency()
    local _, _, latencyHome, latencyWorld = GetNetStats()

    cachedWorldLatency = math_max((latencyWorld or 0) / 1000, 0)
    cachedRealmLatency = math_max((latencyHome or 0) / 1000, 0)

    cachedLatency = cachedWorldLatency
    if cachedLatency <= 0 then
        cachedLatency = cachedRealmLatency
    end

    WeavingAPI.cachedLatency = cachedLatency
    WeavingAPI.cachedRealmLatency = cachedRealmLatency
    WeavingAPI.cachedWorldLatency = cachedWorldLatency
end

local function GetCurrentLatency()
    return cachedLatency
end

local function GetPreciseTime()
    return GetClock() + GetCurrentLatency()
end

local function getSpellHastePercent()
    if type(UnitSpellHaste) == "function" then
        return math_max(UnitSpellHaste("player") or 0, 0)
    end

    return 0
end

local function normalizeSpeed(speed)
    local numericSpeed = tonumber(speed)

    if not numericSpeed or numericSpeed < 0 then
        return 0
    end

    return numericSpeed
end

local function updateFastestSwingSpeed()
    local mainSpeed = WeavingAPI.attackSpeed.mainhand or 0
    local offSpeed = WeavingAPI.attackSpeed.offhand or 0

    if mainSpeed > 0 and offSpeed > 0 then
        WeavingAPI.speed = math_min(mainSpeed, offSpeed)
    elseif mainSpeed > 0 then
        WeavingAPI.speed = mainSpeed
    elseif offSpeed > 0 then
        WeavingAPI.speed = offSpeed
    else
        WeavingAPI.speed = 0
    end
end

local function resolveTrackedSpell(spellGroup)
    for index = 1, #spellGroup do
        local spellId = spellGroup[index]
        local spellName, _, _, castTime = GetSpellInfo(spellId)

        if spellName and castTime and castTime > 0 then
            return {
                spellId = spellId,
                spellName = spellName,
                castTime = castTime / 1000,
            }
        end
    end

    return nil
end

function aura_env.setSwingState(speed, expirationTime, hand)
    if hand ~= "mainhand" and hand ~= "offhand" then
        return
    end

    if speed ~= nil then
        WeavingAPI.attackSpeed[hand] = normalizeSpeed(speed)
    end

    if expirationTime ~= nil then
        WeavingAPI.attackExpirationTime[hand] = tonumber(expirationTime) or 0
    end

    updateFastestSwingSpeed()
end

function WeavingAPI:refreshSwingState()
    UpdateLatency()

    local mainSpeed, offSpeed = UnitAttackSpeed("player")

    self.unitGUID = UnitGUID("player")

    if mainSpeed ~= nil then
        self.attackSpeed.mainhand = normalizeSpeed(mainSpeed)
    end

    if offSpeed ~= nil then
        self.attackSpeed.offhand = normalizeSpeed(offSpeed)
    else
        self.attackSpeed.offhand = 0
    end

    if self.attackSpeed.mainhand > 0 and self.attackExpirationTime.mainhand <= 0 then
        self.attackExpirationTime.mainhand = GetPreciseTime() + self.attackSpeed.mainhand
    end

    if self.attackSpeed.offhand > 0 and self.attackExpirationTime.offhand <= 0 then
        self.attackExpirationTime.offhand = GetPreciseTime() + self.attackSpeed.offhand
    end

    updateFastestSwingSpeed()
end

function WeavingAPI:refreshSpellState()
    self.unitGUID = UnitGUID("player")
    self.spellHaste = getSpellHastePercent()
    self.cachedLatency = GetCurrentLatency()
end

function WeavingAPI:rebuildSpellCatalog()
    self.trackedSpellCatalog = {}
    self.trackedSpellLookup = {}

    for index = 1, #trackedSpellGroups do
        local spellInfo = resolveTrackedSpell(trackedSpellGroups[index])

        if spellInfo then
            self.trackedSpellCatalog[#self.trackedSpellCatalog + 1] = spellInfo
            self.trackedSpellLookup[spellInfo.spellId] = spellInfo
        end
    end

    self.spellCatalogDirty = false
end

function WeavingAPI:ensureSpellCatalog()
    if self.spellCatalogDirty then
        self:rebuildSpellCatalog()
    end
end

function WeavingAPI:clearActiveCast()
    self.currentSpellId = nil
    self.spellCastTime = 0
    self.spellExpirationTime = nil
end

function WeavingAPI:swingWillBeClipped(spellExpirationTime, spellId)
    if not spellExpirationTime or spellExpirationTime <= 0 then
        return
    end

    if self.attackSpeed.mainhand > 0
        and self.attackExpirationTime.mainhand > 0
        and self.attackExpirationTime.mainhand < spellExpirationTime
    then
        scanEvent("SWING_TIMER_WILL_CLIPPED", "mainhand", self.spellCastTime, spellId)
    end

    if self.attackSpeed.offhand > 0
        and self.attackExpirationTime.offhand > 0
        and self.attackExpirationTime.offhand < spellExpirationTime
    then
        scanEvent("SWING_TIMER_WILL_CLIPPED", "offhand", self.spellCastTime, spellId)
    end
end

function WeavingAPI:updateStatus(spellSource, now, spellHaste, latency)
    local spellId
    local spellName
    local castTime

    if type(spellSource) == "table" then
        spellId = spellSource.spellId
        spellName = spellSource.spellName
        castTime = spellSource.castTime
    else
        spellId = spellSource

        if not self.spellIds[spellId] then
            return
        end

        local cachedSpell = self.trackedSpellLookup[spellId]
        if not cachedSpell then
            return
        end

        spellName = cachedSpell.spellName
        castTime = cachedSpell.castTime
    end

    if not spellName or not castTime or castTime <= 0 then
        return
    end

    now = now or GetClock()
    spellHaste = spellHaste or self.spellHaste or getSpellHastePercent()
    latency = latency or self.cachedLatency or GetCurrentLatency()

    local hasteMultiplier = 1 + (math_max(spellHaste, 0) / 100)
    local effectiveCastTime = math_max(0, castTime / hasteMultiplier)
    local preciseNow = now + latency

    local _, _, _, _, endTime = UnitCastingInfo("player")
    local castEndsAt

    if self.isCasting and endTime then
        local remainingCastTime = math_max(0, (endTime / 1000) - now)
        self.spellCastTime = remainingCastTime
        castEndsAt = preciseNow + remainingCastTime
    else
        self.spellCastTime = effectiveCastTime
        castEndsAt = preciseNow + effectiveCastTime
    end

    self.spellExpirationTime = castEndsAt

    scanEvent(
        "WEAVING_UPDATE_STATUS",
        self.speed,
        self.spellCastTime,
        self.spellExpirationTime,
        spellId,
        spellName,
        self.isCasting
    )

    if self.isCasting then
        self:swingWillBeClipped(self.spellExpirationTime, spellId)
    end
end

function WeavingAPI:mainEventsHandler()
    self:refreshSpellState()
    self:ensureSpellCatalog()

    if self.isCasting then
        if self.currentSpellId then
            local currentSpell = self.trackedSpellLookup[self.currentSpellId]
            if currentSpell then
                local now = GetClock()
                self:updateStatus(currentSpell, now, self.spellHaste, self.cachedLatency)
            else
                self:clearActiveCast()
            end
        end

        return
    end

    local now = GetClock()

    for index = 1, #self.trackedSpellCatalog do
        self:updateStatus(self.trackedSpellCatalog[index], now, self.spellHaste, self.cachedLatency)
    end
end

function WeavingAPI:UNIT_AURA(_event, _unit)
    self:refreshSwingState()
    self:mainEventsHandler()
end

function WeavingAPI:UNIT_ATTACK_SPEED(_event, _unit)
    self:refreshSwingState()
    self:mainEventsHandler()
end

function WeavingAPI:COMBAT_RATING_UPDATE(_event)
    self:refreshSwingState()
    self:mainEventsHandler()
end

function WeavingAPI:PLAYER_EQUIPMENT_CHANGED(_event, _slot)
    self:refreshSwingState()
    self:mainEventsHandler()
end

function WeavingAPI:SPELLS_CHANGED(_event)
    UpdateLatency()
    self.spellCatalogDirty = true
    self:mainEventsHandler()
end

function WeavingAPI:PLAYER_ENTERING_WORLD(_event)
    self.spellCatalogDirty = true
    self:refreshSwingState()
    self:mainEventsHandler()
end

function WeavingAPI:PLAYER_ENTER_COMBAT(_event)
    self:refreshSwingState()
    self:mainEventsHandler()
end

function WeavingAPI:PLAYER_LEAVE_COMBAT(_event)
    self:refreshSwingState()
    self:mainEventsHandler()
end

function WeavingAPI:spellsEventsHandler(event, _unit, _guid, spellId)
    local isCasting = (event == "UNIT_SPELLCAST_START" or event == "UNIT_SPELLCAST_DELAYED")
    self.isCasting = isCasting

    UpdateLatency()

    if spellId == nil or not self.spellIds[spellId] then
        self:clearActiveCast()

        if isCasting then
            local spellName = spellId and select(1, GetSpellInfo(spellId)) or ""
            scanEvent("WEAVING_UPDATE_STATUS", self.speed, 0, nil, spellId or 0, spellName, true)
        else
            self:mainEventsHandler()
        end

        return
    end

    local cachedSpell = self.trackedSpellLookup[spellId]
    if not cachedSpell then
        if not isCasting then
            self:clearActiveCast()
            self:mainEventsHandler()
        end

        return
    end

    if isCasting then
        self:refreshSpellState()

        self.currentSpellId = spellId

        local now = GetClock()
        self:updateStatus(cachedSpell, now, self.spellHaste, self.cachedLatency)
        return
    end

    self:clearActiveCast()
    self:mainEventsHandler()
end

function WeavingAPI:UNIT_SPELLCAST_START(event, _unit, _guid, spellId)
    self:spellsEventsHandler(event, _unit, _guid, spellId)
end

function WeavingAPI:UNIT_SPELLCAST_INTERRUPTED(event, _unit, _guid, spellId)
    self:spellsEventsHandler(event, _unit, _guid, spellId)
end

function WeavingAPI:UNIT_SPELLCAST_FAILED(event, _unit, _guid, spellId)
    self:spellsEventsHandler(event, _unit, _guid, spellId)
end

function WeavingAPI:UNIT_SPELLCAST_SUCCEEDED(event, _unit, _guid, spellId)
    self:spellsEventsHandler(event, _unit, _guid, spellId)
end

function WeavingAPI:UNIT_SPELLCAST_DELAYED(event, _unit, _guid, spellId)
    self:spellsEventsHandler(event, _unit, _guid, spellId)
end

function WeavingAPI:UNIT_SPELLCAST_STOP(event, _unit, _guid, spellId)
    self:spellsEventsHandler(event, _unit, _guid, spellId)
end

WeavingAPI:refreshSwingState()
WeavingAPI:rebuildSpellCatalog()

weavingFrame:RegisterEvent("PLAYER_ENTER_COMBAT")
weavingFrame:RegisterEvent("PLAYER_LEAVE_COMBAT")
weavingFrame:RegisterEvent("PLAYER_ENTERING_WORLD")
weavingFrame:RegisterEvent("PLAYER_EQUIPMENT_CHANGED")
weavingFrame:RegisterEvent("COMBAT_RATING_UPDATE")
weavingFrame:RegisterEvent("SPELLS_CHANGED")
weavingFrame:RegisterUnitEvent("UNIT_AURA", "player")
weavingFrame:RegisterUnitEvent("UNIT_ATTACK_SPEED", "player")
weavingFrame:RegisterUnitEvent("UNIT_SPELLCAST_START", "player")
weavingFrame:RegisterUnitEvent("UNIT_SPELLCAST_INTERRUPTED", "player")
weavingFrame:RegisterUnitEvent("UNIT_SPELLCAST_FAILED", "player")
weavingFrame:RegisterUnitEvent("UNIT_SPELLCAST_SUCCEEDED", "player")
weavingFrame:RegisterUnitEvent("UNIT_SPELLCAST_DELAYED", "player")
weavingFrame:RegisterUnitEvent("UNIT_SPELLCAST_STOP", "player")

weavingFrame:SetScript("OnEvent", function(_, event, ...)
    local handler = WeavingAPI[event]

    if handler then
        handler(WeavingAPI, event, ...)
    end
end)
```
