const rouletteItems = document.getElementById("rouletteItems");
const spinBtn = document.getElementById("spinBtn");
const result = document.getElementById("result");

const itemWidth = 124;
let initialOffset = -itemWidth * Math.random();

// Define items with their rarities, icons, and names
const items = [
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
  { name: "Phoenix", icon: "fa-dove", rarity: "legendary" },
];

// Define rarity chances (probability in percentage)
const rarityChances = {
  common: 60, // 60% chance for common items
  rare: 25, // 25% chance for rare items
  epic: 10, // 10% chance for epic items
  legendary: 5, // 5% chance for legendary items
};

// Variable to store predetermined outcome
let predeterminedItem = null;

// Chance to place epic/legendary items adjacent to the selected item (in percentage)
let adjacentSpecialItemChance = 30; // 30% chance by default

// Function to set a predetermined outcome
function setPredeterminedOutcome(itemName) {
  // Find the item by name
  const item = items.find((item) => item.name === itemName);
  if (item) {
    predeterminedItem = item;
    return true;
  }
  return false;
}

// Function to set the chance of placing epic/legendary items adjacent to the selected item
function setAdjacentSpecialItemChance(percentage) {
  if (percentage >= 0 && percentage <= 100) {
    adjacentSpecialItemChance = percentage;
    return true;
  }
  return false;
}

// Create a weighted selection function that will pick items based on their rarity
function getRandomItemByRarity() {
  // If there's a predetermined item, return it and reset
  if (predeterminedItem) {
    const item = predeterminedItem;
    predeterminedItem = null; // Reset after use
    return item;
  }

  // Generate a random number between 0 and 100
  const randomNum = Math.random() * 100;

  // Filter items by rarity based on the random number
  let selectedRarity;
  let cumulativeChance = 0;

  for (const [rarity, chance] of Object.entries(rarityChances)) {
    cumulativeChance += chance;
    if (randomNum <= cumulativeChance) {
      selectedRarity = rarity;
      break;
    }
  }

  // Get all items of the selected rarity
  const itemsOfRarity = items.filter((item) => item.rarity === selectedRarity);

  // Return a random item from the filtered list
  return itemsOfRarity[Math.floor(Math.random() * itemsOfRarity.length)];
}

// Create a longer array with items selected by their rarity probability
let extendedItems = [];

// Generate 50 items for the roulette with proper rarity distribution
for (let i = 0; i < 50; i++) {
  extendedItems.push(getRandomItemByRarity());
}

// Shuffle the extended items array
extendedItems = shuffleArray(extendedItems);

// Create the initial set of items
createRouletteItems(extendedItems);

// Set initial position
rouletteItems.style.transform = `translateX(${initialOffset}px)`;

// Cubic bezier function to mimic CSS easing
function cubicBezier(x1, y1, x2, y2, t) {
  // Bezier curve formula for t parameter
  const calcBezier = (t, p0, p1, p2, p3) => {
    return (
      (1 - t) ** 3 * p0 +
      3 * (1 - t) ** 2 * t * p1 +
      3 * (1 - t) * t ** 2 * p2 +
      t ** 3 * p3
    );
  };

  // For a cubic bezier, p0 is (0,0) and p3 is (1,1)
  return calcBezier(t, 0, y1, y2, 1);
}

// Function to get the item currently under the selector
function getItemUnderSelector() {
  // Get the current transform value
  const transformValue = window.getComputedStyle(rouletteItems).transform;
  const matrix = new DOMMatrix(transformValue);
  const translateX = matrix.m41; // Get the translateX value including initial offset

  // Get the container width and calculate center position
  const containerWidth = document.querySelector(
    ".roulette-container"
  ).offsetWidth;
  const centerPosition = containerWidth / 2;

  // Get all roulette items
  const items = document.querySelectorAll(".roulette-item");

  // Calculate which item is under the selector
  const itemPositions = Array.from(items).map((item, index) => {
    const itemLeft = index * itemWidth + translateX;
    const itemCenter = itemLeft + itemWidth / 2;
    return {
      item,
      distance: Math.abs(itemCenter - centerPosition),
      index,
    };
  });

  // Sort by distance to center
  itemPositions.sort((a, b) => a.distance - b.distance);

  // Return the closest item or null if no items
  return itemPositions.length > 0 ? itemPositions[0] : null;
}

// Function to update which item is under the selector
function updateItemUnderSelector() {
  // Get all roulette items
  const items = document.querySelectorAll(".roulette-item");

  // Remove the under-selector class from all items
  items.forEach((item) => {
    item.classList.remove("under-selector");
  });

  // Get the item under the selector
  const closestItem = getItemUnderSelector();

  // Add the under-selector class to the closest item
  if (closestItem) {
    closestItem.item.classList.add("under-selector");
  }
}

// Add animation frame listener to continuously update the item under selector during animation
let animationFrameId = null;

// Spin button click handler
spinBtn.addEventListener("click", () => {
  // Disable button during spin
  spinBtn.disabled = true;
  result.textContent = ""; // item width + margin

  // Calculate a position that will create a near miss for epic/legendary items
  const containerWidth = document.querySelector(
    ".roulette-container"
  ).offsetWidth;
  const centerPosition = containerWidth / 2;

  // Determine the number of items to scroll
  const minScroll = 20; // Minimum number of items to scroll for effect
  const maxScroll = 30; // Maximum number of items to scroll
  const scrollItems =
    Math.floor(Math.random() * (maxScroll - minScroll + 1)) + minScroll;

  // Find a position that will create a near miss with epic/legendary
  // or use a position that will land on our predetermined item if set
  let targetIndex;

  if (predeterminedItem) {
    // Find the index of our predetermined item in the extended items array
    // or place it at a specific position if not found
    const predIndex = extendedItems.findIndex(
      (item) =>
        item.name === predeterminedItem.name &&
        item.rarity === predeterminedItem.rarity
    );

    if (predIndex >= 0) {
      targetIndex = predIndex;
    } else {
      // If the predetermined item isn't in the array, place it at a random position
      const randomPos = Math.floor(Math.random() * extendedItems.length);
      extendedItems[randomPos] = predeterminedItem;
      targetIndex = randomPos;

      // Determine if we should place an epic or legendary item adjacent to the predetermined item
      if (Math.random() * 100 < adjacentSpecialItemChance) {
        // Decide whether to place the special item to the left or right
        const placeToLeft = Math.random() < 0.5;
        const adjacentIndex = placeToLeft
          ? (targetIndex - 1 + extendedItems.length) % extendedItems.length
          : (targetIndex + 1) % extendedItems.length;

        // Get a random epic or legendary item
        const specialItems = items.filter(
          (item) => item.rarity === "epic" || item.rarity === "legendary"
        );
        const specialItem =
          specialItems[Math.floor(Math.random() * specialItems.length)];

        // Place the special item adjacent to the target
        extendedItems[adjacentIndex] = specialItem;
      }
    }
  } else {
    // Use the original near miss logic if no predetermined item
    targetIndex = findNearMissPosition(extendedItems, scrollItems);
  }

  // Calculate the final position
  const scrollDistance = -(targetIndex * itemWidth);
  const adjustment = centerPosition - itemWidth / 2;
  const finalPosition = scrollDistance + adjustment;

  // Start animation frame to update item under selector
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }

  function updateDuringAnimation() {
    updateItemUnderSelector();
    animationFrameId = requestAnimationFrame(updateDuringAnimation);
  }

  updateDuringAnimation();

  // Apply the animation using JavaScript instead of CSS transitions
  // Remove any existing transition
  rouletteItems.style.transition = "none";

  // Animation variables
  const startTime = performance.now();
  const startPosition = initialOffset;
  const distance = finalPosition;
  const duration = 5000; // 5 seconds, same as the original CSS transition

  // Animation function using requestAnimationFrame
  function animateRoulette(currentTime) {
    // Calculate elapsed time
    const elapsedTime = currentTime - startTime;

    if (elapsedTime / duration < 1) {
      // Calculate current position using cubic-bezier easing
      // This approximates the cubic-bezier(0.1, 0.7, 0.1, 1) from CSS
      const progress = elapsedTime / duration;
      const easedProgress = cubicBezier(0.1, 0.7, 0.1, 1, progress);
      const currentPosition =
        startPosition + (distance + startPosition) * easedProgress;

      // Apply the new position
      rouletteItems.style.transform = `translateX(${currentPosition}px)`;

      // Continue the animation
      animationFrameId = requestAnimationFrame(animateRoulette);
    } else {
      console.log(1);
      // Ensure we end at exactly the right position
      if (window.asd)
        rouletteItems.style.transform = `translateX(${
          startPosition + distance
        }px)`;

      // Get the selected item (the one at the center)
      const selectedItem = extendedItems[targetIndex];

      // Show result
      result.innerHTML = `You got: <span style="color: ${getRarityColor(
        selectedItem.rarity
      )}">${selectedItem.name}</span>!`;

      // Highlight near misses
      highlightNearMisses(targetIndex);

      // Re-enable button
      spinBtn.disabled = false;
    }
  }

  // Start the animation
  animationFrameId = requestAnimationFrame(animateRoulette);
});

// Function to create roulette items
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

  // Initialize which item is under the selector
  updateItemUnderSelector();
}

// Function to find a position that will create a near miss with epic/legendary items
function findNearMissPosition(items, scrollCount) {
  // Start from a random position
  const startPos = Math.floor((Math.random() * items.length) / 2);

  // Calculate the target position after scrolling
  let targetPos = (startPos + scrollCount) % items.length;

  // Check if there's an epic or legendary item nearby
  const nearbyRange = 3;
  let hasNearbySpecial = false;

  for (let i = 1; i <= nearbyRange; i++) {
    const checkPos = (targetPos + i) % items.length;
    if (
      items[checkPos].rarity === "epic" ||
      items[checkPos].rarity === "legendary"
    ) {
      hasNearbySpecial = true;
      break;
    }
  }

  // If no special items nearby, try to find a position with one
  if (!hasNearbySpecial) {
    for (let i = 0; i < items.length; i++) {
      const checkPos = (targetPos + i) % items.length;
      const nextPos = (checkPos + 1) % items.length;

      if (
        items[nextPos].rarity === "epic" ||
        items[nextPos].rarity === "legendary"
      ) {
        targetPos = checkPos;
        break;
      }
    }
  }

  return targetPos;
}

// Function to highlight near misses
function highlightNearMisses(selectedIndex) {
  const items = document.querySelectorAll(".roulette-item");
  const nearbyRange = 2;

  for (let i = 1; i <= nearbyRange; i++) {
    const nearMissIndex = (selectedIndex + i) % extendedItems.length;
    const item = extendedItems[nearMissIndex];

    if (item && (item.rarity === "epic" || item.rarity === "legendary")) {
      items[nearMissIndex].classList.add("near-miss");
    }
  }
}

// Helper function to shuffle an array
function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// Helper function to get color based on rarity
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

// Expose the setPredeterminedOutcome function globally
window.setPredeterminedOutcome = setPredeterminedOutcome;

// Helper function to get all available item names
window.getAvailableItems = function () {
  return items.map((item) => ({ name: item.name, rarity: item.rarity }));
};

// Initialize which item is under the selector on page load
document.addEventListener("DOMContentLoaded", () => {
  updateItemUnderSelector();
});
