// ...existing code...

// When initializing gridstack or adding widgets
const initGrid = () => {
    const grid = GridStack.init({
        // ...existing code...
        column: 12, // ensure we have a reasonable number of columns
        minWidth: 768, // minimum width for the grid
    });

    // When adding widgets, ensure they have a width
    grid.addWidget({
        w: 4, // Set a default width (4 out of 12 columns)
        h: 2, // Set a default height
        // ...existing code...
    });

    // Or if you're using a different method to add widgets:
    // grid.addWidget(el, {x: 0, y: 0, width: 4, height: 2});
};

// If you're loading widgets from saved data, ensure width is set
const loadGrid = (items) => {
    items.forEach((item) => {
        // Ensure each item has a width property
        if (!item.w && !item.width) {
            item.w = 4; // Default width if not specified
        }
    });

    grid.load(items);
};

// ...existing code...
