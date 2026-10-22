import React, { useCallback, useEffect, useRef, useState } from 'react';

const ITEMS = [
  { id: 'mine', name: 'Mine', price: 10, topKey: '1', bottomKey: 'm' },
  { id: 'wall', name: 'Wall', price: 5, topKey: '2', bottomKey: ',' },
  { id: 'cannon', name: 'Cannon', price: 15, topKey: '3', bottomKey: '.' },
  { id: 'flag', name: 'Flag', price: 20, topKey: '4', bottomKey: '/' },
];
const UPGRADES = [
  { id: 'fortune', name: 'Fortune', description: '+1 coin per pickup', basePrice: 10, priceStep: 6 },
  { id: 'speed', name: 'Speed', description: '+7 movement speed', basePrice: 10, priceStep: 5 },
  { id: 'armor', name: 'Armor', description: '-0.5 sec cannon stun', basePrice: 10, priceStep: 10 },
];

const initialInventory = () => ({ mine: 0, wall: 0, cannon: 0, flag: 0 });
const initialUpgrades = () => ({ fortune: 0, speed: 0, armor: 0 });
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
  return <span className={`item-glyph glyph-${item.id}${small ? ' glyph-small' : ''}`} aria-hidden="true">{item.id === 'mine' ? 'MINE' : item.id === 'wall' ? '▰' : item.id === 'cannon' ? '●' : '⚑'}</span>;
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

function StorePanel({ side, gold, mode, upgrades }) {
  const isTop = side === 'top';
  const slots = mode === 'supply'
    ? ITEMS.map((item, index) => ({ ...item, index, key: isTop ? item.topKey : item.bottomKey }))
    : [
      ...UPGRADES.map((upgrade, index) => ({
        ...upgrade,
        index,
        key: isTop ? String(index + 1) : ITEMS[index].bottomKey,
        level: upgrades[upgrade.id],
        price: upgrade.basePrice + upgrade.priceStep * upgrades[upgrade.id],
      })),
      { id: 'empty', name: 'EMPTY', index: 3, key: isTop ? '4' : ITEMS[3].bottomKey, price: null },
    ];

  return (
    <div className={`store-panel ${isTop ? 'store-top' : 'store-bottom'}`} role="dialog" aria-label={`${isTop ? 'Red' : 'Blue'} player store`}>
      <div className="store-heading">
        <span>{mode === 'supply' ? 'FIELD SUPPLY' : 'POWER-UPS'}</span>
        <span className="store-funds">◈ {gold} G</span>
      </div>
      <div className="store-mode-hint">{isTop ? 'Q' : 'ENTER'} TO SWITCH {mode === 'supply' ? 'TO POWER-UPS' : 'TO FIELD SUPPLY'}</div>
      <div className="store-items">
        {slots.map((slot) => (
          <div className={`shop-item${slot.id === 'empty' ? ' shop-empty' : ''}`} key={slot.id}>
            <span className="shop-key">{slot.key}</span>
            {mode === 'supply'
              ? <ItemGlyph item={slot} />
              : <span className={`upgrade-glyph upgrade-${slot.id}`} aria-hidden="true">{slot.id === 'fortune' ? '◈' : slot.id === 'speed' ? '➤' : slot.id === 'armor' ? '⬡' : '—'}</span>}
            <span className="shop-name">{slot.name}</span>
            {slot.description && <span className="shop-description">{slot.description}</span>}
            {slot.price !== null && <span className="shop-price">◈ {slot.price}</span>}
            {slot.level !== undefined && <span className="shop-level">LEVEL {slot.level}</span>}
            <span className="shop-index">0{slot.index + 1}</span>
          </div>
        ))}
      </div>
      <div className="store-footnote">{isTop ? 'PRESS LEFT SHIFT TO CLOSE' : 'PRESS RIGHT SHIFT TO CLOSE'} <span>{isTop ? '1—4 TO BUY' : 'M / , / . / / TO BUY'}</span></div>
    </div>
  );
}

function App() {
  const [players, setPlayers] = useState({
    top: { x: 50, y: 28 },
    bottom: { x: 50, y: 72 },
  });
  const [coins, setCoins] = useState(() => [
    { id: 1, side: 'top', ...randomSpot('top') },
    { id: 2, side: 'bottom', ...randomSpot('bottom') },
  ]);
  const [gold, setGold] = useState({ top: 20, bottom: 20 });
  const [inventory, setInventory] = useState({ top: initialInventory(), bottom: initialInventory() });
  const [upgrades, setUpgrades] = useState({ top: initialUpgrades(), bottom: initialUpgrades() });
  const [placed, setPlaced] = useState([]);
  const [openStore, setOpenStore] = useState(null);
  const [storeMode, setStoreMode] = useState('supply');
  const [notice, setNotice] = useState(null);
  const heldKeys = useRef(new Set());
  const arenaRef = useRef(null);
  const inputState = useRef(null);
  const noticeTimer = useRef(null);
  const nextCoinId = useRef(3);
  const collectedCoinIds = useRef(new Set());
  const upgradesRef = useRef(upgrades);
  upgradesRef.current = upgrades;

  const announce = useCallback((side, message) => {
    setNotice({ side, message });
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(''), 1900);
  }, []);

  useEffect(() => {
    let frame;
    let previousTime;
    const animate = (time) => {
      const elapsed = previousTime === undefined ? 0 : Math.min((time - previousTime) / 1000, 0.05);
      previousTime = time;
      const keys = heldKeys.current;
      const bounds = arenaRef.current?.getBoundingClientRect();

      if (keys.size && bounds?.width && bounds?.height && elapsed) {
        setPlayers((current) => {
          const next = { ...current };
          let changed = false;
          const move = (side, directions) => {
            const horizontal = Number(keys.has(directions.right)) - Number(keys.has(directions.left));
            const vertical = Number(keys.has(directions.down)) - Number(keys.has(directions.up));
            if (!horizontal && !vertical) return;

            const scale = horizontal && vertical ? Math.SQRT1_2 : 1;
              const moveSpeed = 250 + upgradesRef.current[side].speed * 7;
            const player = {
              x: Math.max(4, Math.min(96, current[side].x + horizontal * moveSpeed * elapsed * scale / bounds.width * 100)),
              y: Math.max(
                side === 'top' ? 5 : 55,
                Math.min(side === 'top' ? 45 : 95, current[side].y + vertical * moveSpeed * elapsed * scale / bounds.height * 100),
              ),
            };
            if (player.x !== current[side].x || player.y !== current[side].y) {
              next[side] = player;
              changed = true;
            }
          };

          move('top', { up: 'w', down: 's', left: 'a', right: 'd' });
          move('bottom', { up: 'arrowup', down: 'arrowdown', left: 'arrowleft', right: 'arrowright' });
          return changed ? next : current;
        });
      }
      frame = window.requestAnimationFrame(animate);
    };

    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const collected = coins.filter((coin) => (
      !collectedCoinIds.current.has(coin.id) && distance(players[coin.side], coin) < 4.5
    ));
    if (!collected.length) return;

    const collectedIds = new Set(collected.map((coin) => coin.id));
    collectedIds.forEach((id) => collectedCoinIds.current.add(id));
    const replacements = collected.map((coin) => ({
      id: nextCoinId.current++,
      side: coin.side,
      ...randomSpot(coin.side, players[coin.side]),
    }));
    setCoins((current) => [
      ...current.filter((coin) => !collectedIds.has(coin.id)),
      ...replacements,
    ]);
    setGold((current) => {
      const next = { ...current };
      collected.forEach((coin) => { next[coin.side] += 1 + upgrades[coin.side].fortune; });
      return next;
    });
  }, [coins, players, upgrades]);

  const nearStore = useCallback((side) => {
    const store = side === 'top' ? { x: 11, y: 12 } : { x: 89, y: 88 };
    return distance(players[side], store) < 12;
  }, [players]);

  const purchase = useCallback((side, item) => {
    if (gold[side] < item.price) {
      announce(side, 'NOT ENOUGH GOLD');
      return;
    }
    setGold((current) => ({ ...current, [side]: current[side] - item.price }));
    setInventory((current) => ({ ...current, [side]: { ...current[side], [item.id]: current[side][item.id] + 1 } }));
    announce(side, `${item.name.toUpperCase()} ADDED TO STOCK`);
  }, [announce, gold]);

  const purchaseUpgrade = useCallback((side, upgrade) => {
    const level = upgrades[side][upgrade.id];
    const price = upgrade.basePrice + upgrade.priceStep * level;
    if (gold[side] < price) {
      announce(side, 'NOT ENOUGH GOLD');
      return;
    }
    setGold((current) => ({ ...current, [side]: current[side] - price }));
    setUpgrades((current) => ({
      ...current,
      [side]: { ...current[side], [upgrade.id]: current[side][upgrade.id] + 1 },
    }));
    announce(side, `${upgrade.name.toUpperCase()} UPGRADED`);
  }, [announce, gold, upgrades]);

  const placeItem = useCallback((side, item) => {
    if (!inventory[side][item.id]) return;
    const point = players[side];
    setInventory((current) => ({ ...current, [side]: { ...current[side], [item.id]: current[side][item.id] - 1 } }));
    setPlaced((current) => [...current, { id: `${side}-${item.id}-${Date.now()}`, side, item: item.id, x: point.x, y: point.y }]);
  }, [inventory, players]);

  inputState.current = { openStore, storeMode, nearStore, placeItem, purchase, purchaseUpgrade };

  useEffect(() => {
    const onKeyDown = (event) => {
      const key = event.key.toLowerCase();
      if (event.key === 'Tab') {
        event.preventDefault();
        return;
      }
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) event.preventDefault();
      if (event.repeat) return;
      const current = inputState.current;

      if (event.code === 'Enter') event.preventDefault();

      const shiftSide = event.code === 'ShiftLeft' ? 'top' : event.code === 'ShiftRight' ? 'bottom' : null;
      if (shiftSide) {
        if (current.openStore === shiftSide) {
          setOpenStore(null);
          heldKeys.current.clear();
        } else if (!current.openStore && current.nearStore(shiftSide)) {
          setOpenStore(shiftSide);
          setStoreMode('supply');
          heldKeys.current.clear();
        }
        return;
      }

      if (current.openStore) {
        const togglesMode = current.openStore === 'top' ? key === 'q' : event.code === 'Enter';
        if (togglesMode) {
          setStoreMode(current.storeMode === 'supply' ? 'upgrades' : 'supply');
          return;
        }

        if (current.storeMode === 'supply') {
          const item = ITEMS.find((candidate) => (current.openStore === 'top' ? candidate.topKey : candidate.bottomKey) === key);
          if (item) {
            current.purchase(current.openStore, item);
            return;
          }
        } else {
          const upgrade = UPGRADES.find((candidate, index) => (
            (current.openStore === 'top' ? String(index + 1) : ITEMS[index].bottomKey) === key
          ));
          if (upgrade) {
            current.purchaseUpgrade(current.openStore, upgrade);
            return;
          }
        }

        const movingSide = current.openStore === 'top' ? 'bottom' : 'top';
        if (movingSide === 'top' && ['w', 'a', 's', 'd'].includes(key)) heldKeys.current.add(key);
        if (movingSide === 'bottom' && key.startsWith('arrow')) heldKeys.current.add(key);
        return;
      }

      const topItem = ITEMS.find((item) => item.topKey === key);
      const bottomItem = ITEMS.find((item) => item.bottomKey === key);
      if (topItem) current.placeItem('top', topItem);
      if (bottomItem) current.placeItem('bottom', bottomItem);
      if (key.startsWith('arrow')) heldKeys.current.add(key);
      if (['w', 'a', 's', 'd'].includes(key)) heldKeys.current.add(key);
    };

    const onKeyUp = (event) => heldKeys.current.delete(event.key.toLowerCase());
    const clearKeys = () => heldKeys.current.clear();
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearKeys);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearKeys);
    };
  }, []);

  useEffect(() => () => window.clearTimeout(noticeTimer.current), []);

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
          <div className="arena-size"><span>ARENA</span><b>2.5 : 1</b></div>
        </div>

        <div className="hud hud-top">
          <div className="team-label team-red"><span className="team-marker" /><span><b>RED TEAM</b><small>WASD TO MOVE</small></span></div>
          <InventoryStrip inventory={inventory.top} />
          <div className="gold-count"><span className="coin-glyph">◈</span><span className="gold-value">{gold.top}</span><span className="gold-unit">GOLD</span></div>
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
            <div className="store-marker store-marker-top"><span>STORE</span><b>L SHIFT</b></div>
            <div className="store-marker store-marker-bottom"><span>STORE</span><b>R SHIFT</b></div>

            {coins.map((coin) => <div key={coin.id} className={`coin coin-${coin.side}`} style={{ left: `${coin.x}%`, top: `${coin.y}%` }} aria-label={`${coin.side} gold coin`}><span>◈</span></div>)}

            {placed.map((object) => {
              const item = ITEMS.find((entry) => entry.id === object.item);
              return <div className={`placed-object placed-${object.item} placed-${object.side}`} key={object.id} style={{ left: `${object.x}%`, top: `${object.y}%` }}><ItemGlyph item={item} small /></div>;
            })}

            <div className="player player-red" style={{ left: `${players.top.x}%`, top: `${players.top.y}%` }} aria-label="Red player"><span>R</span></div>
            <div className="player player-blue" style={{ left: `${players.bottom.x}%`, top: `${players.bottom.y}%` }} aria-label="Blue player"><span>B</span></div>

            {openStore && <StorePanel side={openStore} gold={gold[openStore]} mode={storeMode} upgrades={upgrades[openStore]} />}
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
          <div className="gold-count"><span className="coin-glyph">◈</span><span className="gold-value">{gold.bottom}</span><span className="gold-unit">GOLD</span></div>
          <InventoryStrip inventory={inventory.bottom} />
          <div className="team-label team-blue"><span className="team-marker" /><span><b>BLUE TEAM</b><small>ARROWS TO MOVE</small></span></div>
        </div>
      </section>

      <footer className="control-legend">
        <div><span className="legend-icon">⌘</span><b>MOVE</b><span>W A S D</span><i /> <span>↑ ← ↓ →</span></div>
        <div><span className="legend-icon legend-gold">◈</span><b>COLLECT</b><span>+1 GOLD PER COIN</span></div>
        <div><span className="legend-icon">⇧</span><b>STORE</b><span>VISIT YOUR STORE</span></div>
        <div className="legend-note">YOUR ITEMS STAY ON YOUR SIDE</div>
      </footer>
    </main>
  );
}

export default App;