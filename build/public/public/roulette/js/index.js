// Built with Bun at 2025-06-05T10:39:13.543Z
// public/roulette/js/index.js
var rouletteItems = document.getElementById("rouletteItems");
var spinBtn = document.getElementById("spinBtn");
var result = document.getElementById("result");
var itemWidth = 124;
var initialOffset = -itemWidth * Math.random();
var items = [
  { name: "Gold Coin", icon: "fa-coins", rarity: "common" },
  { name: "Shield", icon: "fa-shield-halved", rarity: "common" },
  { name: "Sword", icon: "fa-sword", rarity: "common" },
  { name: "Potion", icon: "fa-flask", rarity: "common" },
  { name: "Bow", icon: "fa-bullseye", rarity: "rare" },
  { name: "Magic Scroll", icon: "fa-scroll", rarity: "rare" },
  { name: "Gem", icon: "fa-gem", rarity: "rare" },
  { name: "Crown", icon: "fa-crown", rarity: "epic" },
  { name: "Dragon", icon: "fa-dragon", rarity: "epic" },
  { name: "Staff", icon: "fa-wand-magic-sparkles", rarity: "epic" },
  { name: "Legendary Sword", icon: "fa-khanda", rarity: "legendary" },
  { name: "Phoenix", icon: "fa-dove", rarity: "legendary" }
];
var rarityChances = {
  common: 60,
  rare: 25,
  epic: 10,
  legendary: 5
};
var predeterminedItem = null;
var adjacentSpecialItemChance = 30;
function setPredeterminedOutcome(itemName) {
  const item = items.find((item2) => item2.name === itemName);
  if (item) {
    predeterminedItem = item;
    return true;
  }
  return false;
}
function getRandomItemByRarity() {
  if (predeterminedItem) {
    const item = predeterminedItem;
    predeterminedItem = null;
    return item;
  }
  const randomNum = Math.random() * 100;
  let selectedRarity;
  let cumulativeChance = 0;
  for (const [rarity, chance] of Object.entries(rarityChances)) {
    cumulativeChance += chance;
    if (randomNum <= cumulativeChance) {
      selectedRarity = rarity;
      break;
    }
  }
  const itemsOfRarity = items.filter((item) => item.rarity === selectedRarity);
  return itemsOfRarity[Math.floor(Math.random() * itemsOfRarity.length)];
}
var extendedItems = [];
for (let i = 0;i < 50; i++) {
  extendedItems.push(getRandomItemByRarity());
}
extendedItems = shuffleArray(extendedItems);
createRouletteItems(extendedItems);
rouletteItems.style.transform = `translateX(${initialOffset}px)`;
function cubicBezier(x1, y1, x2, y2, t) {
  const calcBezier = (t2, p0, p1, p2, p3) => {
    return (1 - t2) ** 3 * p0 + 3 * (1 - t2) ** 2 * t2 * p1 + 3 * (1 - t2) * t2 ** 2 * p2 + t2 ** 3 * p3;
  };
  return calcBezier(t, 0, y1, y2, 1);
}
function getItemUnderSelector() {
  const transformValue = window.getComputedStyle(rouletteItems).transform;
  const matrix = new DOMMatrix(transformValue);
  const translateX = matrix.m41;
  const containerWidth = document.querySelector(".roulette-container").offsetWidth;
  const centerPosition = containerWidth / 2;
  const items2 = document.querySelectorAll(".roulette-item");
  const itemPositions = Array.from(items2).map((item, index) => {
    const itemLeft = index * itemWidth + translateX;
    const itemCenter = itemLeft + itemWidth / 2;
    return {
      item,
      distance: Math.abs(itemCenter - centerPosition),
      index
    };
  });
  itemPositions.sort((a, b) => a.distance - b.distance);
  return itemPositions.length > 0 ? itemPositions[0] : null;
}
function updateItemUnderSelector() {
  const items2 = document.querySelectorAll(".roulette-item");
  items2.forEach((item) => {
    item.classList.remove("under-selector");
  });
  const closestItem = getItemUnderSelector();
  if (closestItem) {
    closestItem.item.classList.add("under-selector");
  }
}
var animationFrameId = null;
spinBtn.addEventListener("click", () => {
  spinBtn.disabled = true;
  result.textContent = "";
  const containerWidth = document.querySelector(".roulette-container").offsetWidth;
  const centerPosition = containerWidth / 2;
  const minScroll = 20;
  const maxScroll = 30;
  const scrollItems = Math.floor(Math.random() * (maxScroll - minScroll + 1)) + minScroll;
  let targetIndex;
  if (predeterminedItem) {
    const predIndex = extendedItems.findIndex((item) => item.name === predeterminedItem.name && item.rarity === predeterminedItem.rarity);
    if (predIndex >= 0) {
      targetIndex = predIndex;
    } else {
      const randomPos = Math.floor(Math.random() * extendedItems.length);
      extendedItems[randomPos] = predeterminedItem;
      targetIndex = randomPos;
      if (Math.random() * 100 < adjacentSpecialItemChance) {
        const placeToLeft = Math.random() < 0.5;
        const adjacentIndex = placeToLeft ? (targetIndex - 1 + extendedItems.length) % extendedItems.length : (targetIndex + 1) % extendedItems.length;
        const specialItems = items.filter((item) => item.rarity === "epic" || item.rarity === "legendary");
        const specialItem = specialItems[Math.floor(Math.random() * specialItems.length)];
        extendedItems[adjacentIndex] = specialItem;
      }
    }
  } else {
    targetIndex = findNearMissPosition(extendedItems, scrollItems);
  }
  const scrollDistance = -(targetIndex * itemWidth);
  const adjustment = centerPosition - itemWidth / 2;
  const finalPosition = scrollDistance + adjustment;
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
  function updateDuringAnimation() {
    updateItemUnderSelector();
    animationFrameId = requestAnimationFrame(updateDuringAnimation);
  }
  updateDuringAnimation();
  rouletteItems.style.transition = "none";
  const startTime = performance.now();
  const startPosition = initialOffset;
  const distance = finalPosition;
  const duration = 5000;
  function animateRoulette(currentTime) {
    const elapsedTime = currentTime - startTime;
    if (elapsedTime / duration < 1) {
      const progress = elapsedTime / duration;
      const easedProgress = cubicBezier(0.1, 0.7, 0.1, 1, progress);
      const currentPosition = startPosition + (distance + startPosition) * easedProgress;
      rouletteItems.style.transform = `translateX(${currentPosition}px)`;
      animationFrameId = requestAnimationFrame(animateRoulette);
    } else {
      console.log(1);
      if (window.asd)
        rouletteItems.style.transform = `translateX(${startPosition + distance}px)`;
      const selectedItem = extendedItems[targetIndex];
      result.innerHTML = `You got: <span style="color: ${getRarityColor(selectedItem.rarity)}">${selectedItem.name}</span>!`;
      highlightNearMisses(targetIndex);
      spinBtn.disabled = false;
    }
  }
  animationFrameId = requestAnimationFrame(animateRoulette);
});
function createRouletteItems(itemsArray) {
  rouletteItems.innerHTML = "";
  itemsArray.forEach((item) => {
    const itemElement = document.createElement("div");
    itemElement.className = `roulette-item ${item.rarity}`;
    const iconElement = document.createElement("i");
    iconElement.className = `fas ${item.icon}`;
    const nameElement = document.createElement("div");
    nameElement.className = "name";
    nameElement.textContent = item.name;
    itemElement.appendChild(iconElement);
    itemElement.appendChild(nameElement);
    rouletteItems.appendChild(itemElement);
  });
  updateItemUnderSelector();
}
function findNearMissPosition(items2, scrollCount) {
  const startPos = Math.floor(Math.random() * items2.length / 2);
  let targetPos = (startPos + scrollCount) % items2.length;
  const nearbyRange = 3;
  let hasNearbySpecial = false;
  for (let i = 1;i <= nearbyRange; i++) {
    const checkPos = (targetPos + i) % items2.length;
    if (items2[checkPos].rarity === "epic" || items2[checkPos].rarity === "legendary") {
      hasNearbySpecial = true;
      break;
    }
  }
  if (!hasNearbySpecial) {
    for (let i = 0;i < items2.length; i++) {
      const checkPos = (targetPos + i) % items2.length;
      const nextPos = (checkPos + 1) % items2.length;
      if (items2[nextPos].rarity === "epic" || items2[nextPos].rarity === "legendary") {
        targetPos = checkPos;
        break;
      }
    }
  }
  return targetPos;
}
function highlightNearMisses(selectedIndex) {
  const items2 = document.querySelectorAll(".roulette-item");
  const nearbyRange = 2;
  for (let i = 1;i <= nearbyRange; i++) {
    const nearMissIndex = (selectedIndex + i) % extendedItems.length;
    const item = extendedItems[nearMissIndex];
    if (item && (item.rarity === "epic" || item.rarity === "legendary")) {
      items2[nearMissIndex].classList.add("near-miss");
    }
  }
}
function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1;i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}
function getRarityColor(rarity) {
  switch (rarity) {
    case "common":
      return "#adb5bd";
    case "rare":
      return "#6ea8fe";
    case "epic":
      return "#a370f7";
    case "legendary":
      return "#ffda6a";
    default:
      return "white";
  }
}
window.setPredeterminedOutcome = setPredeterminedOutcome;
window.getAvailableItems = function() {
  return items.map((item) => ({ name: item.name, rarity: item.rarity }));
};
document.addEventListener("DOMContentLoaded", () => {
  updateItemUnderSelector();
});
