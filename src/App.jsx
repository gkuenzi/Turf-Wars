import React, { useCallback, useEffect, useRef, useState } from 'react';

const ITEMS = [
  { id: 'mine', name: 'Mine', price: 10, topKey: '1', bottomKey: 'm', health: 100 },
  { id: 'wall', name: 'Wall', price: 5, topKey: '2', bottomKey: ',', health: 200 },
  { id: 'cannon', name: 'Cannon', price: 15, topKey: '3', bottomKey: '.', health: 100 },
  { id: 'flag', name: 'Flag', price: 50, topKey: '4', bottomKey: '/', health: 10 },
];
const ITEM_RADII = { mine: 9, wall: 24, cannon: 13, flag: 10 };
const UPGRADES = [
  { id: 'fortune', name: 'Fortune', description: '+1 coin per pickup', basePrice: 10, priceStep: 6 },
  { id: 'speed', name: 'Speed', description: '+7 movement speed', basePrice: 10, priceStep: 5 },
  { id: 'armor', name: 'Armor', description: '-0.5 sec cannon stun', basePrice: 10, priceStep: 10 },
  { id: 'handgun', name: 'Handgun', description: '20-round magazine · 10 damage', basePrice: 20, priceStep: 0 },
];
const TURF_IMPROVEMENTS = [
  { id: 'mineOutput', name: 'Mine Output', description: '+1 gold every 5 sec', basePrice: 12, priceStep: 2 },
  { id: 'wallHealth', name: 'Wall Health', description: '+50 wall health', basePrice: 15, priceStep: 5 },
  { id: 'cannonDamage', name: 'Cannon Damage', description: '+2 damage', basePrice: 15, priceStep: 0 },
  { id: 'weaponDamage', name: 'Weapon Damage', description: '+1 handgun damage', basePrice: 15, priceStep: 2 },
];

const initialInventory = () => ({ mine: 0, wall: 0, cannon: 0, flag: 0 });
const initialUpgrades = () => ({ fortune: 0, speed: 0, armor: 0 });
const initialImprovements = () => ({ mineOutput: 0, wallHealth: 0, cannonDamage: 0, weaponDamage: 0 });
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const randomSpot = (side, avoid) => {
  let spot;
  do {
    spot = {
      x: 8 + Math.random() * 84,
      y: side === 'top' ? 8 + Math.random() * 33 : 59 + Math.random() * 33,
    };
  } while (avoid && distance(avoid, spot) < 12);
  return spot;
};

function ItemGlyph({ item, small = false }) {
  return (
    <span className={`item-glyph glyph-${item.id}${small ? ' glyph-small' : ''}`} aria-hidden="true">
      {item.id === 'mine'
        ? <svg viewBox="0 0 48 48"><path className="mine-shaft" d="M5 42V24a19 19 0 0 1 38 0v18z" /><path className="mine-timber" d="M6 24h36M10 15l28 18M38 15L10 33M9 42h30M24 7v34" /><path className="mine-rail" d="M18 29l-5 13m17-13 5 13M15 36h18" /></svg>
        : item.id === 'wall' ? null : item.id === 'cannon' ? '●' : '⚑'}
    </span>
  );
}

function HandgunStatus({ ammo }) {
  return (
    <span className="handgun-ammo" aria-label={`${ammo} handgun bullets remaining`}>
      <svg className="handgun-icon" viewBox="0 0 64 40" aria-hidden="true">
        <path className="pistol-slide" d="M8 10h41l5 4v9H25l-3 4h-7l2-6H8z" />
        <path className="pistol-grip" d="M28 23h13l-2 14H28l-5-10z" />
        <path className="pistol-detail" d="M21 13h19M24 25q7 0 7 6v2M49 18h5M8 10V7h8v3" />
      </svg>
      <span>× {ammo}</span>
    </span>
  );
}

function InventoryStrip({ inventory }) {
  return (
    <div className="inventory-strip" aria-label="Placed item inventory">
      {ITEMS.map((item) => (
        <span className="inventory-item" key={item.id} title={item.name}>
          <ItemGlyph item={item} small /> <span className="inventory-times">×</span> <span>{inventory[item.id]}</span>
        </span>
      ))}
    </div>
  );
}

function StorePanel({ side, gold, mode, upgrades, improvements, ammo }) {
  const isTop = side === 'top';
  const slots = mode === 'supply'
    ? ITEMS.map((item, index) => ({ ...item, index, key: isTop ? item.topKey : item.bottomKey }))
    : (mode === 'upgrades' ? UPGRADES : TURF_IMPROVEMENTS).map((entry, index) => ({
      ...entry,
      index,
      key: isTop ? String(index + 1) : ITEMS[index].bottomKey,
      level: entry.id === 'handgun' ? undefined : (mode === 'upgrades' ? upgrades[entry.id] : improvements[entry.id]),
      price: entry.basePrice + entry.priceStep * ((mode === 'upgrades' ? upgrades[entry.id] : improvements[entry.id]) ?? 0),
      detail: entry.id === 'handgun' ? `AMMO ${ammo}/20` : null,
    }));
  const modeName = mode === 'supply' ? 'FIELD SUPPLY' : mode === 'upgrades' ? 'UPGRADES' : 'TURF IMPROVEMENTS';
  const nextMode = mode === 'supply' ? 'UPGRADES' : mode === 'upgrades' ? 'TURF IMPROVEMENTS' : 'FIELD SUPPLY';
  const glyphs = {
    fortune: '◈', speed: '➤', armor: '⬡', handgun: '▰',
    mineOutput: '◈', wallHealth: '▰', cannonDamage: '●', weaponDamage: '✦',
  };

  return (
    <div className={`store-panel ${isTop ? 'store-top' : 'store-bottom'}`} role="dialog" aria-label={`${isTop ? 'Red' : 'Blue'} player store`}>
      <div className="store-heading">
        <span>{modeName}</span>
        <span className="store-funds">◈ {gold} G</span>
      </div>
      <div className="store-mode-hint">PRESS {isTop ? 'Q' : 'ENTER'} FOR {nextMode}</div>
      <div className="store-items">
        {slots.map((slot) => (
          <div className="shop-item" key={slot.id}>
            <span className="shop-key">{slot.key}</span>
            {mode === 'supply'
              ? <ItemGlyph item={slot} />
              : (
                <span className={`upgrade-glyph upgrade-${slot.id}`} aria-hidden="true">
                  {slot.id === 'handgun'
                    ? <svg className="handgun-icon" viewBox="0 0 64 40"><path className="pistol-slide" d="M8 10h41l5 4v9H25l-3 4h-7l2-6H8z" /><path className="pistol-grip" d="M28 23h13l-2 14H28l-5-10z" /><path className="pistol-detail" d="M21 13h19M24 25q7 0 7 6v2M49 18h5M8 10V7h8v3" /></svg>
                    : glyphs[slot.id]}
                </span>
              )}
            <span className="shop-name">{slot.name}</span>
            {slot.description && <span className="shop-description">{slot.description}</span>}
            {slot.detail && <span className="shop-level">{slot.detail}</span>}
            <span className="shop-price">◈ {slot.price}</span>
            {slot.level !== undefined && <span className="shop-level">LEVEL {slot.level}</span>}
            <span className="shop-index">0{slot.index + 1}</span>
          </div>
        ))}
      </div>
      <div className="store-footnote">{isTop ? 'LEFT CTRL' : 'RIGHT ALT'} CLOSES STORE <span>{isTop ? '1—4 TO BUY' : 'M / , / . / / TO BUY'}</span></div>
    </div>
  );
}

function App() {
  const initialPlayers = { top: { x: 50, y: 28 }, bottom: { x: 50, y: 72 } };
  const playersRef = useRef(initialPlayers);
  const [coins, setCoins] = useState(() => [
    { id: 1, side: 'top', ...randomSpot('top') },
    { id: 2, side: 'bottom', ...randomSpot('bottom') },
  ]);
  const [gold, setGold] = useState({ top: 20, bottom: 20 });
  const [inventory, setInventory] = useState({ top: initialInventory(), bottom: initialInventory() });
  const [upgrades, setUpgrades] = useState({ top: initialUpgrades(), bottom: initialUpgrades() });
  const [improvements, setImprovements] = useState({ top: initialImprovements(), bottom: initialImprovements() });
  const [ammo, setAmmo] = useState({ top: 0, bottom: 0 });
  const [hasHandgun, setHasHandgun] = useState({ top: false, bottom: false });
  const [placed, setPlaced] = useState([]);
  const [projectiles, setProjectiles] = useState([]);
  const [minePops, setMinePops] = useState([]);
  const [pendingCannons, setPendingCannons] = useState({ top: null, bottom: null });
  const [openStore, setOpenStore] = useState(null);
  const [storeMode, setStoreMode] = useState('supply');
  const [notice, setNotice] = useState(null);
  const heldKeys = useRef(new Set());
  const arenaRef = useRef(null);
  const topPlayerRef = useRef(null);
  const bottomPlayerRef = useRef(null);
  const inputState = useRef(null);
  const noticeTimer = useRef(null);
  const nextCoinId = useRef(3);
  const nextObjectId = useRef(1);
  const nextProjectileId = useRef(1);
  const nextPopId = useRef(1);
  const shopHoldTimers = useRef(new Map());
  const collectedCoinIds = useRef(new Set());
  const minePayoutAt = useRef(new Map());
  const cannonFiredAt = useRef(new Map());
  const coinsRef = useRef(coins);
  const placedRef = useRef(placed);
  const projectilesRef = useRef(projectiles);
  const upgradesRef = useRef(upgrades);
  const improvementsRef = useRef(improvements);
  const pendingCannonRef = useRef(pendingCannons);
  coinsRef.current = coins;
  placedRef.current = placed;
  projectilesRef.current = projectiles;
  upgradesRef.current = upgrades;
  improvementsRef.current = improvements;
  pendingCannonRef.current = pendingCannons;

  const announce = useCallback((side, message) => {
    setNotice({ side, message });
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 1900);
  }, []);

  useEffect(() => {
    let frame;
    let previousTime;
    const animate = (time) => {
      const elapsed = previousTime === undefined ? 0 : Math.min((time - previousTime) / 1000, 0.1);
      previousTime = time;
      const keys = heldKeys.current;
      const bounds = arenaRef.current?.getBoundingClientRect();

      if (keys.size && bounds?.width && bounds?.height && elapsed) {
        const current = playersRef.current;
        const next = { ...current };
        const aiming = pendingCannonRef.current;
        const move = (side, directions) => {
          if (aiming[side] || inputState.current?.openStore === side) return;
          const horizontal = Number(keys.has(directions.right)) - Number(keys.has(directions.left));
          const vertical = Number(keys.has(directions.down)) - Number(keys.has(directions.up));
          if (!horizontal && !vertical) return;
          const scale = horizontal && vertical ? Math.SQRT1_2 : 1;
          const moveSpeed = 250 + upgradesRef.current[side].speed * 7;
          next[side] = {
            x: Math.max(4, Math.min(96, current[side].x + horizontal * moveSpeed * elapsed * scale / bounds.width * 100)),
            y: Math.max(
              side === 'top' ? 5 : 55,
              Math.min(side === 'top' ? 45 : 95, current[side].y + vertical * moveSpeed * elapsed * scale / bounds.height * 100),
            ),
          };
        };
        move('top', { up: 'w', down: 's', left: 'a', right: 'd' });
        move('bottom', { up: 'arrowup', down: 'arrowdown', left: 'arrowleft', right: 'arrowright' });
        Object.entries(aiming).forEach(([side, cannon]) => {
          if (!cannon) return;
          const leftKey = side === 'top' ? 'a' : 'arrowleft';
          const rightKey = side === 'top' ? 'd' : 'arrowright';
          const direction = Number(keys.has(rightKey)) - Number(keys.has(leftKey));
          if (direction) {
            const nextAim = { ...cannon, angle: cannon.angle + direction * 120 * elapsed };
            const nextCannons = { ...pendingCannonRef.current, [side]: nextAim };
            pendingCannonRef.current = nextCannons;
            setPendingCannons(nextCannons);
          }
        });
        playersRef.current = next;
        if (topPlayerRef.current) {
          topPlayerRef.current.style.left = `${next.top.x}%`;
          topPlayerRef.current.style.top = `${next.top.y}%`;
        }
        if (bottomPlayerRef.current) {
          bottomPlayerRef.current.style.left = `${next.bottom.x}%`;
          bottomPlayerRef.current.style.top = `${next.bottom.y}%`;
        }

        const collected = coinsRef.current.filter((coin) => (
          !collectedCoinIds.current.has(coin.id) && distance(next[coin.side], coin) < 4.5
        ));
        if (collected.length) {
          const collectedIds = new Set(collected.map((coin) => coin.id));
          collectedIds.forEach((id) => collectedCoinIds.current.add(id));
          const replacements = collected.map((coin) => ({
            id: nextCoinId.current++,
            side: coin.side,
            ...randomSpot(coin.side, next[coin.side]),
          }));
          const remaining = [
            ...coinsRef.current.filter((coin) => !collectedIds.has(coin.id)),
            ...replacements,
          ];
          coinsRef.current = remaining;
          setCoins(remaining);
          setGold((goldNow) => {
            const nextGold = { ...goldNow };
            collected.forEach((coin) => { nextGold[coin.side] += 1 + upgradesRef.current[coin.side].fortune; });
            return nextGold;
          });
        }
      }
      frame = window.requestAnimationFrame(animate);
    };

    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    let previousTime = Date.now();
    const interval = window.setInterval(() => {
      const now = Date.now();
      const elapsed = Math.min((now - previousTime) / 1000, 0.1);
      previousTime = now;
      const bounds = arenaRef.current?.getBoundingClientRect();
      const activePlaced = placedRef.current;
      const mineIncome = { top: 0, bottom: 0 };
      const newMinePops = [];
      activePlaced.forEach((object) => {
        if (object.item !== 'mine') return;
        const lastPayout = minePayoutAt.current.get(object.id) ?? now;
        if (now - lastPayout < 5000) return;
        const payouts = Math.floor((now - lastPayout) / 5000);
        minePayoutAt.current.set(object.id, lastPayout + payouts * 5000);
        mineIncome[object.side] += payouts * (1 + improvementsRef.current[object.side].mineOutput);
        newMinePops.push({
          id: nextPopId.current++,
          x: object.x,
          y: object.y,
          expiresAt: now + 1100,
        });
      });
      if (mineIncome.top || mineIncome.bottom) {
        setGold((current) => ({ top: current.top + mineIncome.top, bottom: current.bottom + mineIncome.bottom }));
      }
      setMinePops((current) => {
        const active = current.filter((pop) => pop.expiresAt > now);
        return newMinePops.length ? [...active, ...newMinePops] : active.length === current.length ? current : active;
      });

      if (!bounds?.width || !bounds?.height) return;
      const spawned = [];
      activePlaced.forEach((object) => {
        if (object.item !== 'cannon') return;
        const lastFired = cannonFiredAt.current.get(object.id) ?? now;
        if (now - lastFired < 2400) return;
        cannonFiredAt.current.set(object.id, now);
        const angle = (object.angle ?? 0) * Math.PI / 180;
        const forward = object.side === 'top' ? 1 : -1;
        spawned.push({
          id: nextProjectileId.current++,
          kind: 'cannon',
          side: object.side,
          x: object.x,
          y: object.y,
          vx: Math.sin(angle) * 380,
          vy: Math.cos(angle) * forward * 380,
          damage: 20 + improvementsRef.current[object.side].cannonDamage * 2,
        });
      });

      const allProjectiles = [...projectilesRef.current, ...spawned];
      if (!allProjectiles.length) return;
      let currentPlaced = activePlaced;
      let placedChanged = false;
      const remaining = [];
      const playerHits = [];
      allProjectiles.forEach((projectile) => {
        const x = projectile.x + projectile.vx * elapsed / bounds.width * 100;
        const y = projectile.y + projectile.vy * elapsed / bounds.height * 100;
        const moved = { ...projectile, x, y };
        if (x < -2 || x > 102 || y < -2 || y > 102) return;

        let hit = false;
        const targetIndex = currentPlaced.findIndex((object) => {
          if (object.side === projectile.side) return false;
          const dx = (x - object.x) * bounds.width / 100;
          const dy = (y - object.y) * bounds.height / 100;
          return Math.hypot(dx, dy) < 23;
        });
        if (targetIndex !== -1) {
          const target = currentPlaced[targetIndex];
          const health = target.health - projectile.damage;
          currentPlaced = currentPlaced.slice();
          if (health <= 0) {
            currentPlaced.splice(targetIndex, 1);
            minePayoutAt.current.delete(target.id);
            cannonFiredAt.current.delete(target.id);
            announce(target.side, `${target.item.toUpperCase()} DESTROYED`);
          } else {
            currentPlaced[targetIndex] = { ...target, health };
          }
          placedChanged = true;
          hit = true;
        }

        if (!hit) {
          const targetSide = projectile.side === 'top' ? 'bottom' : 'top';
          const targetPlayer = playersRef.current[targetSide];
          const dx = (x - targetPlayer.x) * bounds.width / 100;
          const dy = (y - targetPlayer.y) * bounds.height / 100;
          if (Math.hypot(dx, dy) < 19 && inputState.current?.openStore !== targetSide) {
            playerHits.push({ side: targetSide, loss: projectile.kind === 'cannon' ? 0.3 : 0.1 });
            announce(targetSide, projectile.kind === 'cannon' ? 'HIT! LOST 30% GOLD' : 'HIT! LOST 10% GOLD');
            hit = true;
          }
        }
        if (!hit) remaining.push(moved);
      });

      if (placedChanged) {
        placedRef.current = currentPlaced;
        setPlaced(currentPlaced);
      }
      projectilesRef.current = remaining;
      setProjectiles(remaining);
      if (playerHits.length) {
        setGold((current) => {
          const next = { ...current };
          playerHits.forEach(({ side, loss }) => { next[side] -= Math.floor(next[side] * loss); });
          return next;
        });
      }
    }, 25);
    return () => window.clearInterval(interval);
  }, [announce]);

  const nearStore = useCallback((side) => {
    const store = side === 'top' ? { x: 11, y: 12 } : { x: 89, y: 88 };
    return distance(playersRef.current[side], store) < 12;
  }, []);

  const cancelPendingCannon = useCallback((side) => {
    if (!pendingCannonRef.current[side]) return false;
    const nextCannons = { ...pendingCannonRef.current, [side]: null };
    pendingCannonRef.current = nextCannons;
    setPendingCannons(nextCannons);
    announce(side, 'CANNON RETURNED TO HAND');
    return true;
  }, [announce]);

  const toggleStore = useCallback((side) => {
    cancelPendingCannon(side);
    const currentStore = inputState.current?.openStore;
    if (currentStore === side) {
      setOpenStore(null);
      heldKeys.current.clear();
    } else if (!currentStore && nearStore(side)) {
      setOpenStore(side);
      setStoreMode('supply');
      heldKeys.current.clear();
    }
  }, [cancelPendingCannon, nearStore]);

  const removePlacedObject = useCallback((side, object) => {
    const item = ITEMS.find((entry) => entry.id === object.item);
    if (!item) return;
    const damaged = object.health / object.maxHealth < 0.25;
    const refund = Math.floor(item.price * (damaged ? 0.35 : 0.5));
    const nextPlaced = placedRef.current.filter((entry) => entry.id !== object.id);
    placedRef.current = nextPlaced;
    setPlaced(nextPlaced);
    setGold((current) => ({ ...current, [side]: current[side] + refund }));
    minePayoutAt.current.delete(object.id);
    cannonFiredAt.current.delete(object.id);
    announce(side, `${damaged ? 'SOLD' : 'DISASSEMBLED'} · +${refund} GOLD`);
  }, [announce]);

  const startShopHold = useCallback((side) => {
    if (shopHoldTimers.current.has(side)) return true;
    const bounds = arenaRef.current?.getBoundingClientRect();
    if (!bounds?.width || !bounds?.height) return false;
    const player = playersRef.current[side];
    const object = placedRef.current.find((entry) => {
      const dx = (player.x - entry.x) * bounds.width / 100;
      const dy = (player.y - entry.y) * bounds.height / 100;
      return Math.hypot(dx, dy) <= ITEM_RADII[entry.item] + 15;
    });
    if (!object) return false;
    const timer = window.setTimeout(() => {
      shopHoldTimers.current.delete(side);
      const stillPlaced = placedRef.current.find((entry) => entry.id === object.id);
      const currentBounds = arenaRef.current?.getBoundingClientRect();
      if (!stillPlaced || !currentBounds?.width || !currentBounds?.height) return;
      const currentPlayer = playersRef.current[side];
      const dx = (currentPlayer.x - stillPlaced.x) * currentBounds.width / 100;
      const dy = (currentPlayer.y - stillPlaced.y) * currentBounds.height / 100;
      if (Math.hypot(dx, dy) <= ITEM_RADII[stillPlaced.item] + 15) removePlacedObject(side, stillPlaced);
    }, 5000);
    shopHoldTimers.current.set(side, timer);
    return true;
  }, [removePlacedObject]);

  const stopShopHold = useCallback((side) => {
    const timer = shopHoldTimers.current.get(side);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      shopHoldTimers.current.delete(side);
      return true;
    }
    return false;
  }, []);

  const purchase = useCallback((side, item) => {
    if (item.id === 'flag' && (inventory[side].flag > 0 || placed.some((object) => object.side === side && object.item === 'flag'))) {
      announce(side, 'ONLY ONE FLAG ALLOWED');
      return;
    }
    if (gold[side] < item.price) {
      announce(side, 'NOT ENOUGH GOLD');
      return;
    }
    setGold((current) => ({ ...current, [side]: current[side] - item.price }));
    setInventory((current) => ({ ...current, [side]: { ...current[side], [item.id]: current[side][item.id] + 1 } }));
    announce(side, `${item.name.toUpperCase()} ADDED TO STOCK`);
  }, [announce, gold, inventory, placed]);

  const purchaseUpgrade = useCallback((side, upgrade) => {
    const level = upgrades[side][upgrade.id] ?? 0;
    const price = upgrade.basePrice + upgrade.priceStep * level;
    if (gold[side] < price) {
      announce(side, 'NOT ENOUGH GOLD');
      return;
    }
    setGold((current) => ({ ...current, [side]: current[side] - price }));
    if (upgrade.id === 'handgun') {
      setHasHandgun((current) => ({ ...current, [side]: true }));
      setAmmo((current) => ({ ...current, [side]: 20 }));
      announce(side, 'HANDGUN READY · 20 ROUNDS');
      return;
    }
    setUpgrades((current) => ({
      ...current,
      [side]: { ...current[side], [upgrade.id]: current[side][upgrade.id] + 1 },
    }));
    announce(side, `${upgrade.name.toUpperCase()} UPGRADED`);
  }, [announce, gold, upgrades]);

  const purchaseImprovement = useCallback((side, improvement) => {
    const level = improvements[side][improvement.id];
    const price = improvement.basePrice + improvement.priceStep * level;
    if (gold[side] < price) {
      announce(side, 'NOT ENOUGH GOLD');
      return;
    }
    setGold((current) => ({ ...current, [side]: current[side] - price }));
    setImprovements((current) => ({
      ...current,
      [side]: { ...current[side], [improvement.id]: current[side][improvement.id] + 1 },
    }));
    announce(side, `${improvement.name.toUpperCase()} IMPROVED`);
  }, [announce, gold, improvements]);

  const canPlaceItem = useCallback((side, item, position) => {
    const bounds = arenaRef.current?.getBoundingClientRect();
    if (!bounds?.width || !bounds?.height) return false;
    const itemRadius = ITEM_RADII[item.id];
    const storeRects = [
      { left: 2.5, top: 5, width: 10.5, height: 21 },
      { left: 87, top: 74, width: 10.5, height: 21 },
    ];
    const overlapsStore = storeRects.some((store) => {
      const closestX = Math.max(store.left, Math.min(position.x, store.left + store.width));
      const closestY = Math.max(store.top, Math.min(position.y, store.top + store.height));
      const dx = (position.x - closestX) * bounds.width / 100;
      const dy = (position.y - closestY) * bounds.height / 100;
      return Math.hypot(dx, dy) <= itemRadius;
    });
    if (overlapsStore) {
      announce(side, 'CANNOT PLACE ITEMS ON STORE');
      return false;
    }
    const overlapping = placedRef.current.some((object) => {
      const dx = (position.x - object.x) * bounds.width / 100;
      const dy = (position.y - object.y) * bounds.height / 100;
      return Math.hypot(dx, dy) < itemRadius + ITEM_RADII[object.item] + 2;
    });
    if (overlapping) announce(side, 'ITEMS CANNOT OVERLAP');
    return !overlapping;
  }, [announce, nearStore]);

  const deployItem = useCallback((side, item) => {
    if (!inventory[side][item.id]) return;
    const playerPosition = playersRef.current[side];
    if (item.id === 'cannon') {
      const aiming = pendingCannonRef.current[side];
      if (!aiming) {
        if (!canPlaceItem(side, item, playerPosition)) return;
        const nextCannons = {
          ...pendingCannonRef.current,
          [side]: { side, ...playerPosition, angle: 0, deployAt: Date.now() + 1000 },
        };
        pendingCannonRef.current = nextCannons;
        setPendingCannons(nextCannons);
        return;
      }
      if (Date.now() < aiming.deployAt) {
        announce(side, 'CANNON IS ARMING');
        return;
      }
      if (!canPlaceItem(side, item, aiming)) return;
      const id = `${side}-cannon-${nextObjectId.current++}`;
      const now = Date.now();
      const cannon = { id, side, item: 'cannon', x: aiming.x, y: aiming.y, angle: aiming.angle, health: item.health, maxHealth: item.health };
      cannonFiredAt.current.set(id, now);
      const nextPlaced = [...placedRef.current, cannon];
      placedRef.current = nextPlaced;
      setPlaced(nextPlaced);
      setInventory((current) => ({ ...current, [side]: { ...current[side], cannon: current[side].cannon - 1 } }));
      const nextCannons = { ...pendingCannonRef.current, [side]: null };
      pendingCannonRef.current = nextCannons;
      setPendingCannons(nextCannons);
      return;
    }

    if (!canPlaceItem(side, item, playerPosition)) return;
    const id = `${side}-${item.id}-${nextObjectId.current++}`;
    const maxHealth = item.id === 'wall' ? item.health + improvements[side].wallHealth * 50 : item.health;
    const object = { id, side, item: item.id, x: playersRef.current[side].x, y: playersRef.current[side].y, health: maxHealth, maxHealth };
    if (item.id === 'mine') minePayoutAt.current.set(id, Date.now());
    const nextPlaced = [...placedRef.current, object];
    placedRef.current = nextPlaced;
    setPlaced(nextPlaced);
    setInventory((current) => ({ ...current, [side]: { ...current[side], [item.id]: current[side][item.id] - 1 } }));
  }, [canPlaceItem, improvements, inventory]);

  const fireWeapon = useCallback((side) => {
    if (cancelPendingCannon(side)) return;
    if (!hasHandgun[side]) {
      announce(side, 'BUY A HANDGUN AT THE STORE');
      return;
    }
    if (ammo[side] < 1) {
      announce(side, 'OUT OF AMMO · RELOAD AT STORE');
      return;
    }
    const player = playersRef.current[side];
    const projectile = {
      id: nextProjectileId.current++,
      kind: 'bullet',
      side,
      x: player.x,
      y: player.y,
      vx: 0,
      vy: side === 'top' ? 560 : -560,
      damage: 10 + improvements[side].weaponDamage,
    };
    projectilesRef.current = [...projectilesRef.current, projectile];
    setProjectiles(projectilesRef.current);
    setAmmo((current) => ({ ...current, [side]: current[side] - 1 }));
  }, [ammo, announce, cancelPendingCannon, hasHandgun, improvements]);

  inputState.current = {
    openStore, storeMode, nearStore, deployItem, purchase, purchaseUpgrade, purchaseImprovement,
    fireWeapon, pendingCannons, toggleStore, startShopHold, stopShopHold,
  };

  useEffect(() => {
    const onKeyDown = (event) => {
      const key = event.key.toLowerCase();
      if (event.code === 'AltRight') event.preventDefault();
      if (event.code === 'Enter') event.preventDefault();
      if (event.key === 'Tab') {
        event.preventDefault();
        return;
      }
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) event.preventDefault();
      if (event.repeat) return;
      const current = inputState.current;
      const shiftSide = event.code === 'ShiftLeft' ? 'top' : event.code === 'ShiftRight' ? 'bottom' : null;
      const accessSide = event.code === 'ControlLeft' ? 'top' : event.code === 'AltRight' ? 'bottom' : null;

      if (accessSide) {
        if (current.pendingCannons[accessSide]) current.toggleStore(accessSide);
        else if (!current.startShopHold(accessSide)) current.toggleStore(accessSide);
        return;
      }

      if (shiftSide) {
        if (current.openStore !== shiftSide) current.fireWeapon(shiftSide);
        return;
      }

      const rotatingSide = ['top', 'bottom'].find((side) => (
        current.pendingCannons[side]
        && (key === (side === 'top' ? 'a' : 'arrowleft')
          || key === (side === 'top' ? 'd' : 'arrowright')
          || key === ITEMS[2][side === 'top' ? 'topKey' : 'bottomKey'])
      ));
      if (rotatingSide) {
        const deployKey = ITEMS[2][rotatingSide === 'top' ? 'topKey' : 'bottomKey'];
        if (key === deployKey) {
          current.deployItem(rotatingSide, ITEMS[2]);
          heldKeys.current.delete(rotatingSide === 'top' ? 'a' : 'arrowleft');
          heldKeys.current.delete(rotatingSide === 'top' ? 'd' : 'arrowright');
        } else {
          heldKeys.current.add(key);
        }
        return;
      }

      if (current.openStore) {
        const side = current.openStore;
        const togglesMode = side === 'top' ? key === 'q' : event.code === 'Enter';
        if (togglesMode) {
          setStoreMode(current.storeMode === 'supply' ? 'upgrades' : current.storeMode === 'upgrades' ? 'improvements' : 'supply');
          return;
        }
        const itemKey = ITEMS.find((item) => (side === 'top' ? item.topKey : item.bottomKey) === key);
        const modeItems = current.storeMode === 'supply' ? ITEMS : current.storeMode === 'upgrades' ? UPGRADES : TURF_IMPROVEMENTS;
        const purchaseKeyed = modeItems.find((entry, index) => (
          (side === 'top' ? String(index + 1) : ITEMS[index].bottomKey) === key
        ));
        if (current.storeMode === 'supply' && itemKey) current.purchase(side, itemKey);
        else if (current.storeMode === 'upgrades' && purchaseKeyed) current.purchaseUpgrade(side, purchaseKeyed);
        else if (current.storeMode === 'improvements' && purchaseKeyed) current.purchaseImprovement(side, purchaseKeyed);

        const movingSide = side === 'top' ? 'bottom' : 'top';
        if (movingSide === 'top' && ['w', 'a', 's', 'd'].includes(key)) heldKeys.current.add(key);
        if (movingSide === 'bottom' && key.startsWith('arrow')) heldKeys.current.add(key);
        const opponentItem = ITEMS.find((item) => (movingSide === 'top' ? item.topKey : item.bottomKey) === key);
        if (opponentItem) current.deployItem(movingSide, opponentItem);
        return;
      }

      const topItem = ITEMS.find((item) => item.topKey === key);
      const bottomItem = ITEMS.find((item) => item.bottomKey === key);
      if (topItem) current.deployItem('top', topItem);
      if (bottomItem) current.deployItem('bottom', bottomItem);
      if (key.startsWith('arrow')) heldKeys.current.add(key);
      if (['w', 'a', 's', 'd'].includes(key)) heldKeys.current.add(key);
    };

    const onKeyUp = (event) => {
      if (event.code === 'AltRight') event.preventDefault();
      heldKeys.current.delete(event.key.toLowerCase());
      if (event.code === 'ControlLeft') {
        const stoppedHold = currentStopShopHold('top');
        if (stoppedHold && inputState.current?.nearStore('top')) inputState.current.toggleStore('top');
      }
      if (event.code === 'AltRight') {
        const stoppedHold = currentStopShopHold('bottom');
        if (stoppedHold && inputState.current?.nearStore('bottom')) inputState.current.toggleStore('bottom');
      }
    };
    const currentStopShopHold = (side) => inputState.current?.stopShopHold(side);
    const clearKeys = () => {
      heldKeys.current.clear();
      inputState.current?.stopShopHold('top');
      inputState.current?.stopShopHold('bottom');
    };
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    window.addEventListener('blur', clearKeys);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
      window.removeEventListener('blur', clearKeys);
    };
  }, []);

  useEffect(() => () => {
    window.clearTimeout(noticeTimer.current);
    shopHoldTimers.current.forEach((timer) => window.clearTimeout(timer));
  }, []);

  return (
    <main className="game-shell">
      <header className="topline">
        <a className="wordmark" href="#home" aria-label="Turf Wars home"><span className="mark">TW</span><span>TURF <b>WARS</b></span></a>
        <div className="match-status"><span className="live-dot" /> LOCAL MATCH <span className="status-divider">/</span> 01 : 01</div>
        <div className="round-tag">FIELD TEST <span>NO. 001</span></div>
      </header>

      <section className="arena-section" aria-label="Turf Wars game">
        <div className="section-heading">
          <div><span className="eyebrow">TWO SIDES. ONE FIELD.</span><h1>Claim your <em>ground.</em></h1></div>
          <div className="arena-size"><span>ARENA</span><b>EXPANDED FIELD</b></div>
        </div>

        <div className="hud hud-top">
          <div className="team-label team-red"><span className="team-marker" /><span><b>RED TEAM</b><small>WASD TO MOVE · L CTRL STORE</small></span></div>
          <InventoryStrip inventory={inventory.top} />
          <div className="gold-count">{hasHandgun.top && <HandgunStatus ammo={ammo.top} />}<span className="coin-glyph">◈</span><span className="gold-value">{gold.top}</span><span className="gold-unit">GOLD</span></div>
          <button type="button" className="fire-button" onClick={() => inputState.current?.fireWeapon('top')} aria-label="Red player shoot">FIRE <kbd>SHIFT</kbd></button>
        </div>

        <div className="arena-frame">
          <div className="arena" ref={arenaRef} aria-label="Game arena, red territory above blue territory">
            <div className="terrain terrain-red" />
            <div className="terrain terrain-blue" />
            <div className="tint tint-red" />
            <div className="tint tint-blue" />
            <div className="field-mark field-mark-top"><span>01</span><span>RED TERRITORY</span></div>
            <div className="field-mark field-mark-bottom"><span>02</span><span>BLUE TERRITORY</span></div>
            <div className="midline"><span>NO MAN'S LAND</span></div>
            <button type="button" className="store-marker store-marker-top" onClick={() => inputState.current?.toggleStore('top')} aria-label="Red player store">
              <span>STORE</span><b>L CTRL · HOLD 5S</b>
            </button>
            <button type="button" className="store-marker store-marker-bottom" onClick={() => inputState.current?.toggleStore('bottom')} aria-label="Blue player store">
              <span>STORE</span><b>R ALT · HOLD 5S</b>
            </button>

            {coins.map((coin) => <div key={coin.id} className={`coin coin-${coin.side}`} style={{ left: `${coin.x}%`, top: `${coin.y}%` }} aria-label={`${coin.side} gold coin`}><span>◈</span></div>)}

            {placed.map((object) => {
              const item = ITEMS.find((entry) => entry.id === object.item);
              return (
                <div
                  className={`placed-object placed-${object.item} placed-${object.side}`}
                  key={object.id}
                  style={{ left: `${object.x}%`, top: `${object.y}%`, transform: `translate(-50%, -50%) rotate(${object.item === 'cannon' ? (object.side === 'top' ? 180 - object.angle : object.angle) : 0}deg)` }}
                  aria-label={`${object.side} ${object.item}, ${object.health} health`}
                >
                  <ItemGlyph item={item} small />
                  <span className="health-meter"><span className="health-fill" style={{ width: `${Math.max(0, object.health / object.maxHealth * 100)}%` }} /></span>
                </div>
              );
            })}

            {Object.values(pendingCannons).filter(Boolean).map((pendingCannon) => (
              <div key={pendingCannon.side} className={`placed-object placed-cannon placed-${pendingCannon.side} cannon-aiming`} style={{ left: `${pendingCannon.x}%`, top: `${pendingCannon.y}%`, transform: `translate(-50%, -50%) rotate(${pendingCannon.side === 'top' ? 180 - pendingCannon.angle : pendingCannon.angle}deg)` }}>
                <ItemGlyph item={ITEMS[2]} small />
                <span className="aim-label">HOLD {pendingCannon.side === 'top' ? 'A / D' : '← / →'} TO AIM · DEPLOY AFTER 1 SEC</span>
              </div>
            ))}

              {projectiles.map((projectile) => <span key={projectile.id} className={`projectile projectile-${projectile.kind} projectile-${projectile.side}`} style={{ left: `${projectile.x}%`, top: `${projectile.y}%` }} />)}
            {minePops.map((pop) => <span key={pop.id} className="mine-pop" style={{ left: `${pop.x}%`, top: `${pop.y}%` }}>◈</span>)}

            <div ref={topPlayerRef} className="player player-red" style={{ left: `${initialPlayers.top.x}%`, top: `${initialPlayers.top.y}%` }} aria-label="Red player"><span>R</span></div>
            <div ref={bottomPlayerRef} className="player player-blue" style={{ left: `${initialPlayers.bottom.x}%`, top: `${initialPlayers.bottom.y}%` }} aria-label="Blue player"><span>B</span></div>

            {openStore && <StorePanel side={openStore} gold={gold[openStore]} mode={storeMode} upgrades={upgrades[openStore]} improvements={improvements[openStore]} ammo={ammo[openStore]} />}
            {notice && (
              <>
                <div className={`notice notice-position-${notice.side} notice-color-${notice.side}`} role="status">{notice.message}</div>
                <div className={`notice notice-position-${notice.side === 'top' ? 'bottom' : 'top'} notice-color-${notice.side}`} role="status">
                  {notice.side === 'top' ? 'RED' : 'BLUE'} PLAYER {notice.message}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="hud hud-bottom">
          <div className="gold-count"><span className="coin-glyph">◈</span><span className="gold-value">{gold.bottom}</span><span className="gold-unit">GOLD</span>{hasHandgun.bottom && <HandgunStatus ammo={ammo.bottom} />}</div>
          <button type="button" className="fire-button" onClick={() => inputState.current?.fireWeapon('bottom')} aria-label="Blue player shoot">FIRE <kbd>SHIFT</kbd></button>
          <InventoryStrip inventory={inventory.bottom} />
          <div className="team-label team-blue"><span className="team-marker" /><span><b>BLUE TEAM</b><small>ARROWS TO MOVE · R ALT STORE</small></span></div>
        </div>
      </section>

      <footer className="control-legend">
        <div><span className="legend-icon">⌘</span><b>MOVE</b><span>W A S D</span><i /> <span>↑ ← ↓ →</span></div>
        <div><span className="legend-icon legend-gold">◈</span><b>MINES</b><span>+1 GOLD / 5 SEC</span></div>
        <div><span className="legend-icon">⇧</span><b>FIRE / SHOP PAGES</b><span>SHIFT · Q / ENTER</span></div>
        <div className="legend-note">VISIT STORE TO RELOAD · CANNONS FIRE AUTOMATICALLY</div>
      </footer>
    </main>
  );
}

export default App;
