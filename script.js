// Data structures
let inventory = [];
let sales = [];
let currentCart = [];
let comboSelections = new Set();
let sellComboSelections = new Set();
let comboCounter = 1;
let currentEditId = null;
let currentDeleteId = null;
let importedData = null;
let lastSaleData = null;

// Tax rate (10.2% - prices are inclusive)
const TAX_RATE = 0.102;

// Calculate pre-tax price from tax-inclusive price
function getPreTaxPrice(inclusivePrice) {
    return inclusivePrice / (1 + TAX_RATE);
}

// Calculate tax amount
function getTaxAmount(inclusivePrice) {
    return inclusivePrice - getPreTaxPrice(inclusivePrice);
}

// Modal functions
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    
    // Reset modal states
    if (modalId === 'edit-modal') {
        currentEditId = null;
    } else if (modalId === 'delete-modal') {
        currentDeleteId = null;
    } else if (modalId === 'import-modal') {
        importedData = null;
        document.getElementById('import-file-input').value = '';
        document.getElementById('import-file-name').textContent = '';
        document.getElementById('import-confirm-btn').disabled = true;
    }
}

// Close modal when clicking outside
document.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal-overlay')) {
        closeModal(event.target.id);
    }
});

// Load data from localStorage
function loadData() {
    const savedInventory = localStorage.getItem('craftMarketInventory');
    const savedSales = localStorage.getItem('craftMarketSales');
    const savedCounter = localStorage.getItem('craftMarketComboCounter');
    
    if (savedInventory) {
        inventory = JSON.parse(savedInventory);
        
        // Validate inventory items
        const validInventory = inventory.filter(item => {
            return item && item.id && item.name && typeof item.price === 'number';
        });
        
        if (validInventory.length !== inventory.length) {
            inventory = validInventory;
            saveData(); // Save the cleaned inventory
        }
    }
    
    if (savedSales) {
        sales = JSON.parse(savedSales);
    }
    if (savedCounter) {
        comboCounter = parseInt(savedCounter);
    }
    
    renderInventory();
    renderSellItems();
    renderSales();
    renderComboSelection();
}

// Save data to localStorage
function saveData() {
    localStorage.setItem('craftMarketInventory', JSON.stringify(inventory));
    localStorage.setItem('craftMarketSales', JSON.stringify(sales));
    localStorage.setItem('craftMarketComboCounter', comboCounter.toString());
}

// Clear error state
function clearError(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.classList.remove('error');
    }
}

// Set error state
function setError(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.classList.add('error');
        setTimeout(() => element.classList.remove('error'), 3000);
    }
}

// Navigation
function showScreen(screenName) {
    const screens = document.querySelectorAll('.screen');
    const buttons = document.querySelectorAll('.nav-btn');
    
    screens.forEach(screen => screen.classList.remove('active'));
    buttons.forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(`${screenName}-screen`).classList.add('active');
    event.target.classList.add('active');
    
    if (screenName === 'sell') {
        renderSellItems();
        renderSellComboSelection();
    } else if (screenName === 'inventory') {
        renderComboSelection();
        renderInventory();
    } else if (screenName === 'sales') {
        renderSales();
    }
}

// Add product
function addProduct() {
    const name = document.getElementById('product-name').value.trim();
    const price = parseFloat(document.getElementById('product-price').value);
    const stock = parseInt(document.getElementById('product-stock').value);
    
    // Clear previous errors
    clearError('product-name');
    clearError('product-price');
    clearError('product-stock');
    
    let hasError = false;
    
    if (!name) {
        setError('product-name');
        hasError = true;
    }
    if (isNaN(price)) {
        setError('product-price');
        hasError = true;
    }
    if (isNaN(stock)) {
        setError('product-stock');
        hasError = true;
    }
    
    if (hasError) {
        return;
    }
    
    const product = {
        id: Date.now(),
        name: name,
        price: price,
        startingStock: stock,
        currentStock: stock,
        isCombo: false
    };
    
    inventory.push(product);
    saveData();
    renderInventory();
    renderComboSelection();
    
    // Clear form
    document.getElementById('product-name').value = '';
    document.getElementById('product-price').value = '';
    document.getElementById('product-stock').value = '';
}

// Edit product
function editProduct(id) {
    const item = inventory.find(i => i.id === id);
    if (!item) return;
    
    currentEditId = id;
    document.getElementById('edit-product-name').value = item.name;
    document.getElementById('edit-product-price').value = item.price;
    document.getElementById('edit-product-stock').value = item.startingStock;
    
    openModal('edit-modal');
}

// Save edit
function saveEdit() {
    const item = inventory.find(i => i.id === currentEditId);
    if (!item) return;
    
    const newName = document.getElementById('edit-product-name').value.trim();
    const newPriceStr = document.getElementById('edit-product-price').value;
    const newPrice = parseFloat(newPriceStr);
    const newStockStr = document.getElementById('edit-product-stock').value;
    const newStock = parseInt(newStockStr);
    
    // Clear previous errors
    clearError('edit-product-name');
    clearError('edit-product-price');
    clearError('edit-product-stock');
    
    let hasError = false;
    
    if (!newName) {
        setError('edit-product-name');
        hasError = true;
    }
    if (isNaN(newPrice)) {
        setError('edit-product-price');
        hasError = true;
    }
    if (isNaN(newStock)) {
        setError('edit-product-stock');
        hasError = true;
    }
    
    if (hasError) {
        return;
    }
    
    const previousStartingStock = item.startingStock;
    const previousCurrentStock = item.currentStock;
    const stockDelta = newStock - previousStartingStock;
    item.name = newName;
    item.price = newPrice;
    item.startingStock = newStock;
    item.currentStock = Math.max(0, Math.min(newStock, previousCurrentStock + stockDelta));
    
    saveData();
    renderInventory();
    renderComboSelection();
    closeModal('edit-modal');
}

// Delete product
function deleteProduct(id) {
    const item = inventory.find(i => i.id === id);
    if (!item) return;
    
    currentDeleteId = id;
    document.getElementById('delete-item-name').textContent = item.name;
    openModal('delete-modal');
}

// Confirm delete
function confirmDelete() {
    inventory = inventory.filter(item => item.id !== currentDeleteId);
    saveData();
    renderInventory();
    renderComboSelection();
    closeModal('delete-modal');
}

// Render inventory
function renderInventory() {
    const container = document.getElementById('inventory-list');
    container.innerHTML = '';
    
    inventory.forEach(item => {
        const div = document.createElement('div');
        div.className = 'inventory-item';
        
        let comboLabel = '';
        if (item.isCombo) {
            comboLabel = '<div style="display: inline-block; background: var(--pastel-lavender); padding: 4px 10px; border-radius: 6px; font-size: 13px; font-weight: 700; margin-bottom: 8px;">COMBO</div>';
        }
        
        let comboInfo = '';
        if (item.isCombo && item.comboItems) {
            comboInfo = '<div style="margin-top: 10px;">';
            item.comboItems.forEach(ci => {
                comboInfo += `<span class="combo-item-tag">${ci.name}</span>`;
            });
            comboInfo += '</div>';
        }
        
        div.innerHTML = `
            ${comboLabel}
            <h3>${item.name}</h3>
            <div class="price">$${item.price.toFixed(2)}</div>
            <div class="stock">Starting: ${item.startingStock} | Current: ${item.currentStock}</div>
            ${comboInfo}
        `;
        
        const canEdit = item.startingStock === item.currentStock;
        if (canEdit) {
            const buttonContainer = document.createElement('div');
            buttonContainer.style.marginTop = '12px';
            buttonContainer.style.display = 'flex';
            buttonContainer.style.gap = '8px';

            const editBtn = document.createElement('button');
            editBtn.className = 'btn btn-small btn-secondary';
            editBtn.textContent = 'Edit';
            editBtn.onclick = (e) => {
                e.stopPropagation();
                editProduct(item.id);
            };
            buttonContainer.appendChild(editBtn);

            if (item.startingStock === item.currentStock) {
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'btn btn-small remove-btn';
                deleteBtn.textContent = 'Delete';
                deleteBtn.onclick = (e) => {
                    e.stopPropagation();
                    deleteProduct(item.id);
                };
                buttonContainer.appendChild(deleteBtn);
            }

            div.appendChild(buttonContainer);
        }
        
        container.appendChild(div);
    });
}

// Render combo selection for inventory
function renderComboSelection() {
    const container = document.getElementById('combo-items-selection');
    container.innerHTML = '';
    
    const regularItems = inventory.filter(item => !item.isCombo);
    
    if (regularItems.length === 0) {
        container.innerHTML = '<p style="color: var(--text-medium);">Add some products first to create combos</p>';
        return;
    }
    
    regularItems.forEach(item => {
        const div = document.createElement('div');
        div.className = 'checkbox-item';
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.gap = '12px';
        div.style.padding = '14px';
        div.style.background = 'white';
        div.style.borderRadius = '10px';
        div.style.marginBottom = '8px';
        div.style.cursor = 'pointer';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `combo-check-${item.id}`;
        checkbox.value = item.id;
        checkbox.style.width = '24px';
        checkbox.style.height = '24px';
        checkbox.style.cursor = 'pointer';
        
        checkbox.addEventListener('change', function() {
            updateComboSelections();
        });
        
        const labelText = document.createElement('span');
        labelText.textContent = `${item.name} - $${item.price.toFixed(2)}`;
        labelText.style.fontSize = '16px';
        labelText.style.fontWeight = '600';
        labelText.style.cursor = 'pointer';
        labelText.style.flex = '1';
        
        labelText.addEventListener('click', function() {
            checkbox.checked = !checkbox.checked;
            checkbox.dispatchEvent(new Event('change'));
        });
        
        div.appendChild(checkbox);
        div.appendChild(labelText);
        container.appendChild(div);
    });
}

// Generate combo name from items
function generateComboName(items) {
    if (items.length === 0) return `Combo #${comboCounter}`;
    if (items.length === 1) return `${items[0].name} Set`;
    if (items.length === 2) return `${items[0].name} + ${items[1].name}`;
    return `${items[0].name} + ${items[1].name} + ${items.length - 2} more`;
}

// Update combo selections
function updateComboSelections() {
    comboSelections.clear();
    document.querySelectorAll('#combo-items-selection input:checked').forEach(cb => {
        comboSelections.add(parseInt(cb.value));
    });
    
    let total = 0;
    comboSelections.forEach(id => {
        const item = inventory.find(i => i.id === id);
        if (item) total += item.price;
    });
    
    const comboTotalInput = document.getElementById('combo-total');
    if (comboTotalInput) {
        comboTotalInput.value = total.toFixed(2);
    }
    updateComboPrice();
}

// Update combo price with discount
function updateComboPrice() {
    const comboTotalInput = document.getElementById('combo-total');
    const comboFinalInput = document.getElementById('combo-final-price');
    const comboDiscountInput = document.getElementById('combo-discount');
    
    if (!comboTotalInput || !comboFinalInput) {
        return;
    }
    
    const total = parseFloat(comboTotalInput.value) || 0;
    const discountValue = comboDiscountInput ? (parseFloat(comboDiscountInput.value) || 0) : 0;
    const discountTypeElement = document.querySelector('input[name="combo-discount-type"]:checked');
    const discountType = discountTypeElement ? discountTypeElement.value : 'amount';
    
    let discount = 0;
    if (discountType === 'percent') {
        discount = total * (discountValue / 100);
    } else {
        discount = discountValue;
    }
    
    const final = Math.max(0, total - discount);
    comboFinalInput.value = final.toFixed(2);
}

// Create combo
function createCombo() {
    let name = document.getElementById('combo-name').value.trim();
    const stock = parseInt(document.getElementById('combo-stock').value) || 1;
    const finalPriceStr = document.getElementById('combo-final-price').value;
    const finalPrice = parseFloat(finalPriceStr);
    
    if (comboSelections.size === 0) {
        alert('Please select items for the combo');
        return;
    }
    
    const comboItems = [];
    comboSelections.forEach(id => {
        const item = inventory.find(i => i.id === id);
        if (item) {
            comboItems.push({
                id: item.id,
                name: item.name,
                price: item.price
            });
        }
    });
    
    // Auto-generate name if empty
    if (!name) {
        name = generateComboName(comboItems);
        comboCounter++;
    }
    
    // Calculate total from combo-total field
    const totalStr = document.getElementById('combo-total').value;
    const total = parseFloat(totalStr) || 0;
    
    // Use finalPrice if valid, otherwise use total
    let price = total;
    if (finalPriceStr && finalPriceStr.trim() !== '' && !isNaN(finalPrice) && finalPrice > 0) {
        price = finalPrice;
    }
    
    if (price === 0) {
        alert('Error: Combo price cannot be $0. Please select items first.');
        return;
    }
    
    const combo = {
        id: Date.now(),
        name: name,
        price: price,
        startingStock: stock,
        currentStock: stock,
        isCombo: true,
        comboItems: comboItems
    };
    
    inventory.push(combo);
    saveData();
    renderInventory();
    
    // Clear form
    document.getElementById('combo-name').value = '';
    document.getElementById('combo-stock').value = '1';
    document.getElementById('combo-discount').value = '';
    document.getElementById('combo-total').value = '';
    document.getElementById('combo-final-price').value = '';
    comboSelections.clear();
    renderComboSelection();
}

// Render sell items grid
function renderSellItems() {
    const container = document.getElementById('sell-items-grid');
    container.innerHTML = '';
    
    inventory.forEach(item => {
        const div = document.createElement('div');
        div.className = 'sell-item';
        div.onclick = () => addToCart(item);
        
        let comboLabel = '';
        if (item.isCombo) {
            comboLabel = '<div style="background: var(--pastel-lavender); padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 700; margin-bottom: 8px; display: inline-block;">COMBO</div>';
        }
        
        let stockInfo = '';
        if (item.currentStock === 0) {
            stockInfo = '<div class="stock" style="color: #ff6b6b;">OUT OF STOCK</div>';
        } else {
            stockInfo = `<div class="stock">Stock: ${item.currentStock}</div>`;
        }
        
        div.innerHTML = `
            ${comboLabel}
            <h3>${item.name}</h3>
            <div class="price">$${item.price.toFixed(2)}</div>
            ${stockInfo}
        `;
        container.appendChild(div);
    });
}

// Add item to cart
function addToCart(item) {
    const existingItem = currentCart.find(cartItem => cartItem.productId === item.id);

    if (existingItem) {
        existingItem.quantity = (existingItem.quantity || 1) + 1;
        renderCart();
        return;
    }

    const cartItem = {
        id: Date.now(),
        productId: item.id,
        name: item.name,
        price: item.price,
        originalPrice: item.price,
        discount: 0,
        discountType: 'amount',
        isCombo: item.isCombo,
        comboItems: item.comboItems || null,
        quantity: 1
    };
    
    currentCart.push(cartItem);
    renderCart();
}

// Quick add item
function quickAddItem() {
    const name = document.getElementById('quick-item-name').value.trim();
    const priceStr = document.getElementById('quick-item-price').value;
    const price = parseFloat(priceStr);
    
    // Clear previous errors
    clearError('quick-item-name');
    clearError('quick-item-price');
    
    let hasError = false;
    
    if (!name) {
        setError('quick-item-name');
        hasError = true;
    }
    if (isNaN(price)) {
        setError('quick-item-price');
        hasError = true;
    }
    
    if (hasError) {
        return;
    }
    
    // Check for existing quick add item
    const existingItem = currentCart.find(i => i.isQuickAdd && i.name === name && i.price === price);
    
    if (existingItem) {
        existingItem.quantity = (existingItem.quantity || 1) + 1;
        renderCart();
        
        document.getElementById('quick-item-name').value = '';
        document.getElementById('quick-item-price').value = '';
        return;
    }

    const cartItem = {
        id: Date.now(),
        productId: null,
        name: name,
        price: price,
        originalPrice: price,
        discount: 0,
        discountType: 'amount',
        isCombo: false,
        isQuickAdd: true,
        quantity: 1
    };
    
    currentCart.push(cartItem);
    renderCart();
    
    document.getElementById('quick-item-name').value = '';
    document.getElementById('quick-item-price').value = '';
}

// Update cart item discount
function updateCartDiscount(cartItemId) {
    const cartItem = currentCart.find(item => item.id === cartItemId);
    if (!cartItem) return;
    
    const discountInput = document.getElementById(`discount-${cartItemId}`);
    const discountTypeRadio = document.querySelector(`input[name="cart-discount-type-${cartItemId}"]:checked`);
    
    const discountValue = parseFloat(discountInput.value) || 0;
    const discountType = discountTypeRadio ? discountTypeRadio.value : 'amount';
    
    cartItem.discountType = discountType;
    
    if (discountType === 'percent') {
        const percentDiscount = Math.max(0, Math.min(discountValue, 100));
        cartItem.discount = percentDiscount;
        cartItem.price = cartItem.originalPrice * (1 - percentDiscount / 100);
    } else {
        const amountDiscount = Math.max(0, Math.min(discountValue, cartItem.originalPrice));
        cartItem.discount = amountDiscount;
        cartItem.price = cartItem.originalPrice - amountDiscount;
    }
    
    renderCart();
}

// Render sell combo selection
function renderSellComboSelection() {
    const container = document.getElementById('sell-combo-selection');
    container.innerHTML = '';
    
    const regularItems = inventory.filter(item => !item.isCombo);
    
    if (regularItems.length === 0) {
        container.innerHTML = '<p style="color: var(--text-medium);">No items available for combo</p>';
        return;
    }
    
    regularItems.forEach(item => {
        const div = document.createElement('div');
        div.className = 'checkbox-item';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `sell-combo-check-${item.id}`;
        checkbox.value = item.id;
        checkbox.onchange = () => updateSellComboSelections();
        
        const label = document.createElement('label');
        label.htmlFor = `sell-combo-check-${item.id}`;
        label.textContent = `${item.name} - $${item.price.toFixed(2)}`;
        
        div.appendChild(checkbox);
        div.appendChild(label);
        container.appendChild(div);
    });
}

// Update sell combo selections
function updateSellComboSelections() {
    sellComboSelections.clear();
    document.querySelectorAll('#sell-combo-selection input:checked').forEach(cb => {
        sellComboSelections.add(parseInt(cb.value));
    });
    
    let total = 0;
    sellComboSelections.forEach(id => {
        const item = inventory.find(i => i.id === id);
        if (item) total += item.price;
    });
    
    document.getElementById('sell-combo-total').value = total.toFixed(2);
    updateSellComboPrice();
}

// Update sell combo price
function updateSellComboPrice() {
    const total = parseFloat(document.getElementById('sell-combo-total').value) || 0;
    const discountValue = parseFloat(document.getElementById('sell-combo-discount').value) || 0;
    const discountTypeElement = document.querySelector('input[name="sell-combo-discount-type"]:checked');
    const discountType = discountTypeElement ? discountTypeElement.value : 'amount';
    
    let discount = 0;
    if (discountType === 'percent') {
        discount = total * (discountValue / 100);
    } else {
        discount = discountValue;
    }
    
    const final = Math.max(0, total - discount);
    document.getElementById('sell-combo-final').value = final.toFixed(2);
}

// Add combo to cart
function addComboToCart() {
    let name = document.getElementById('sell-combo-name').value.trim();
    const finalPriceStr = document.getElementById('sell-combo-final').value;
    const finalPrice = parseFloat(finalPriceStr);
    
    if (sellComboSelections.size === 0) {
        alert('Please select items for the combo');
        return;
    }
    
    const comboItems = [];
    sellComboSelections.forEach(id => {
        const item = inventory.find(i => i.id === id);
        if (item) {
            comboItems.push({
                id: item.id,
                name: item.name,
                price: item.price
            });
        }
    });
    
    // Auto-generate name if empty
    if (!name) {
        name = generateComboName(comboItems);
        comboCounter++;
    }
    
    const originalPrice = comboItems.reduce((sum, item) => sum + item.price, 0);
    const price = (finalPrice && !isNaN(finalPrice)) ? finalPrice : originalPrice;
    
    // Check for existing combo in cart
    const existingItem = currentCart.find(i => i.isCombo && i.name === name && i.price === price);
    
    if (existingItem) {
        existingItem.quantity = (existingItem.quantity || 1) + 1;
        renderCart();
        
        // Clear form
        document.getElementById('sell-combo-name').value = '';
        document.getElementById('sell-combo-discount').value = '';
        document.getElementById('sell-combo-total').value = '';
        document.getElementById('sell-combo-final').value = '';
        sellComboSelections.clear();
        renderSellComboSelection();
        return;
    }

    const cartItem = {
        id: Date.now(),
        productId: null,
        name: name,
        price: price,
        originalPrice: originalPrice,
        discount: 0,
        discountType: 'amount',
        isCombo: true,
        comboItems: comboItems,
        quantity: 1
    };
    
    currentCart.push(cartItem);
    renderCart();
    
    // Clear form
    document.getElementById('sell-combo-name').value = '';
    document.getElementById('sell-combo-discount').value = '';
    document.getElementById('sell-combo-total').value = '';
    document.getElementById('sell-combo-final').value = '';
    sellComboSelections.clear();
    renderSellComboSelection();
}

// Update cart item quantity
function updateQuantity(itemId, change) {
    const item = currentCart.find(i => i.id === itemId);
    if (!item) return;
    
    item.quantity = (item.quantity || 1) + change;
    
    if (item.quantity <= 0) {
        removeFromCart(itemId);
    } else {
        renderCart();
    }
}

// Render cart
function renderCart() {
    const container = document.getElementById('cart-items');
    container.innerHTML = '';
    
    let total = 0;
    currentCart.forEach(item => {
        const qty = item.quantity || 1;
        total += item.price * qty;
        
        const div = document.createElement('div');
        div.className = 'cart-item';
        
        let typeInfo = '';
        if (item.isCombo) {
            typeInfo = ' <span style="background: var(--pastel-lavender); padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 700;">COMBO</span>';
        }
        
        const discountVal = item.discountType === 'percent' ? item.discount : item.discount;
        const maxValue = item.discountType === 'percent' ? '100' : item.originalPrice;
        
        // Compact discount section
        const discountSection = `
            <div class="cart-discount-compact">
                <span style="font-weight: 600; color: var(--text-medium);">Discount (per unit):</span>
                <input type="number" id="discount-${item.id}" value="${discountVal}" 
                       step="0.01" min="0" max="${maxValue}"
                       oninput="updateCartDiscount(${item.id})">
                <div class="cart-discount-toggles">
                    <label title="Amount">
                        <input type="radio" name="cart-discount-type-${item.id}" value="amount" ${item.discountType === 'amount' ? 'checked' : ''} onchange="updateCartDiscount(${item.id})">
                        $
                    </label>
                    <label title="Percent">
                        <input type="radio" name="cart-discount-type-${item.id}" value="percent" ${item.discountType === 'percent' ? 'checked' : ''} onchange="updateCartDiscount(${item.id})">
                        %
                    </label>
                </div>
            </div>
        `;
        
        let priceDisplay = `<strong style="font-size: 18px;">$${item.price.toFixed(2)}</strong>`;
        if (item.price !== item.originalPrice) {
            priceDisplay = `
                <div style="text-align: right; line-height: 1.2;">
                    <div style="font-size: 12px; color: var(--text-medium); text-decoration: line-through;">$${item.originalPrice.toFixed(2)}</div>
                    <strong style="font-size: 18px; color: #4caf50;">$${item.price.toFixed(2)}</strong>
                </div>
            `;
        }
        
        // Quantity controls
        const quantityControls = `
            <div style="display: flex; align-items: center; gap: 5px; margin-right: 10px; background: #f0f0f0; padding: 2px; border-radius: 6px;">
                <button class="btn btn-small" style="padding: 2px 8px; min-width: 24px; height: 24px; line-height: 1; font-size: 16px;" onclick="updateQuantity(${item.id}, -1)">-</button>
                <span style="font-weight: 600; min-width: 20px; text-align: center;">${qty}</span>
                <button class="btn btn-small" style="padding: 2px 8px; min-width: 24px; height: 24px; line-height: 1; font-size: 16px;" onclick="updateQuantity(${item.id}, 1)">+</button>
            </div>
        `;
        
        div.innerHTML = `
            <div class="cart-item-header" style="margin-bottom: 8px;">
                <div style="flex: 1; padding-right: 10px;">
                    <div class="cart-item-name" style="font-size: 16px;">${item.name}${typeInfo}</div>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    ${quantityControls}
                    ${priceDisplay}
                    <button class="remove-btn-icon" onclick="removeFromCart(${item.id})" title="Remove">×</button>
                </div>
            </div>
            ${discountSection}
        `;
        container.appendChild(div);
    });
    
    document.getElementById('cart-total').textContent = `Total: $${total.toFixed(2)}`;
}

// Remove from cart
function removeFromCart(itemId) {
    currentCart = currentCart.filter(item => item.id !== itemId);
    renderCart();
}

// Clear cart
function clearCart() {
    if (currentCart.length === 0 || confirm('Clear all items from cart?')) {
        currentCart = [];
        renderCart();
    }
}

// Complete sale
function completeSale() {
    if (currentCart.length === 0) {
        alert('Cart is empty');
        return;
    }
    
    const timestamp = new Date().toISOString();
    const saleItems = [];
    
    currentCart.forEach(item => {
        const qty = item.quantity || 1;

        // Update inventory stock
        if (item.productId) {
            const invItem = inventory.find(i => i.id === item.productId);
            if (invItem && invItem.currentStock > 0) {
                invItem.currentStock = Math.max(0, invItem.currentStock - qty);
            }
        }
        
        // If combo, update component items stock
        if (item.isCombo && item.comboItems) {
            item.comboItems.forEach(ci => {
                const invItem = inventory.find(i => i.id === ci.id);
                if (invItem && invItem.currentStock > 0) {
                    invItem.currentStock = Math.max(0, invItem.currentStock - qty);
                }
            });
        }
        
        // Record sale
        const saleRecord = {
            id: Date.now() + Math.random(),
            timestamp: timestamp,
            name: item.name,
            price: item.price,
            originalPrice: item.originalPrice,
            isCombo: item.isCombo,
            comboItems: item.comboItems,
            quantity: qty
        };
        
        sales.push(saleRecord);
        saleItems.push(saleRecord);
    });
    
    // Store last sale data for invoice
    lastSaleData = {
        timestamp: timestamp,
        items: saleItems
    };
    
    saveData();
    currentCart = [];
    renderCart();
    renderInventory();
    renderSellItems();
    renderSales();
    
    // Show invoice
    showInvoice();
}

// Render sales
function renderSales() {
    const tbody = document.getElementById('sales-tbody');
    tbody.innerHTML = '';
    
    let totalRevenue = 0;
    
    if (sales.length === 0) {
        // Show empty state
        tbody.innerHTML = `
            <tr>
                <td colspan="4">
                    <div class="empty-state">
                        <div class="empty-state-icon">📊</div>
                        <div class="empty-state-text">No sales yet</div>
                        <p style="margin-top: 10px; font-size: 14px;">Sales will appear here once you complete a transaction</p>
                    </div>
                </td>
            </tr>
        `;
        document.getElementById('total-revenue').textContent = `$0.00`;
        return;
    }
    
    // Sort sales by timestamp descending
    const sortedSales = [...sales].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    sortedSales.forEach(sale => {
        const qty = sale.quantity || 1;
        const totalItemPrice = sale.price * qty;
        totalRevenue += totalItemPrice;
        
        const tr = document.createElement('tr');
        
        const date = new Date(sale.timestamp);
        const dateStr = date.toLocaleString();
        
        let typeLabel = 'Regular';
        if (sale.isCombo) {
            typeLabel = 'Combo';
        } else if (sale.price !== sale.originalPrice) {
            typeLabel = 'Discounted';
        }
        
        // Calculate pre-tax price
        const preTaxPrice = getPreTaxPrice(totalItemPrice);
        const taxAmount = getTaxAmount(totalItemPrice);
        
        tr.innerHTML = `
            <td>${dateStr}</td>
            <td>
                ${sale.name} ${qty > 1 ? `<span style="font-weight: bold; color: var(--text-medium);">x${qty}</span>` : ''}
                ${sale.isCombo && sale.comboItems ? '<br>' + sale.comboItems.map(ci => `<span class="combo-item-tag">${ci.name}</span>`).join('') : ''}
            </td>
            <td>${typeLabel}</td>
            <td>
                <strong>$${totalItemPrice.toFixed(2)}</strong>
                <div style="font-size: 12px; color: var(--text-medium); margin-top: 4px;">
                    Pre-tax: $${preTaxPrice.toFixed(2)} + Tax: $${taxAmount.toFixed(2)}
                </div>
                ${qty > 1 ? `<div style="font-size: 12px; color: var(--text-medium); margin-top: 2px;">$${sale.price.toFixed(2)} each</div>` : ''}
                ${sale.price !== sale.originalPrice ? `<div style="font-size: 13px; color: var(--text-medium); margin-top: 2px;">Original: $${sale.originalPrice.toFixed(2)}</div>` : ''}
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    const totalPreTax = getPreTaxPrice(totalRevenue);
    const totalTax = getTaxAmount(totalRevenue);
    
    document.getElementById('total-revenue').innerHTML = `
        $${totalRevenue.toFixed(2)}<br>
        <span style="font-size: 16px; font-weight: 500;">
            (Pre-tax: $${totalPreTax.toFixed(2)} + Tax: $${totalTax.toFixed(2)})
        </span>
    `;
}

// Export inventory
function exportInventory() {
    const dataStr = JSON.stringify(inventory, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert('Inventory exported successfully!');
}

// Export sales
function exportSales() {
    const dataStr = JSON.stringify(sales, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert('Sales exported successfully!');
}

// Handle import file selection
function handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    document.getElementById('import-file-name').textContent = file.name;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (Array.isArray(data)) {
                importedData = data;
                document.getElementById('import-confirm-btn').disabled = false;
            } else {
                alert('Invalid file format. Please upload a valid JSON array.');
                importedData = null;
                document.getElementById('import-confirm-btn').disabled = true;
            }
        } catch (error) {
            alert('Error reading file. Please make sure it\'s a valid JSON file.');
            importedData = null;
            document.getElementById('import-confirm-btn').disabled = true;
        }
    };
    reader.readAsText(file);
}

// Confirm import
function confirmImport() {
    if (!importedData) return;
    
    let importCount = 0;
    importedData.forEach(item => {
        // Validate item structure
        if (item.name && typeof item.price === 'number' && typeof item.startingStock === 'number') {
            // Create new item with new ID to avoid conflicts
            const newItem = {
                id: Date.now() + Math.random(),
                name: item.name,
                price: item.price,
                startingStock: item.startingStock,
                currentStock: item.currentStock !== undefined ? item.currentStock : item.startingStock,
                isCombo: item.isCombo || false,
                comboItems: item.comboItems || null
            };
            inventory.push(newItem);
            importCount++;
        }
    });
    
    saveData();
    renderInventory();
    renderComboSelection();
    closeModal('import-modal');
    
    alert(`Successfully imported ${importCount} item(s)!`);
}

// Clear all data (opens modal)
function clearAllData() {
    openModal('clear-modal');
}

// Confirm clear all
function confirmClearAll() {
    inventory = [];
    sales = [];
    currentCart = [];
    comboCounter = 1;
    localStorage.removeItem('craftMarketInventory');
    localStorage.removeItem('craftMarketSales');
    localStorage.removeItem('craftMarketComboCounter');
    
    renderInventory();
    renderSellItems();
    renderSales();
    renderCart();
    renderComboSelection();
    
    closeModal('clear-modal');
    alert('✓ All data has been cleared.');
}

// Confirm clear sales
function confirmClearSales() {
    sales = [];
    
    // Reset inventory stock
    inventory.forEach(item => {
        item.currentStock = item.startingStock;
    });
    
    saveData();
    renderSales();
    renderInventory();
    renderSellItems();
    closeModal('clear-sales-modal');
    alert('✓ Sales history has been cleared and inventory stock reset.');
}

// Show invoice
function showInvoice() {
    if (!lastSaleData) return;
    
    const date = new Date(lastSaleData.timestamp);
    document.getElementById('invoice-date').textContent = date.toLocaleString();
    
    // Render invoice items
    const itemsContainer = document.getElementById('invoice-items');
    itemsContainer.innerHTML = '';
    
    let total = 0;
    lastSaleData.items.forEach(item => {
        const qty = item.quantity || 1;
        const itemTotal = item.price * qty;
        total += itemTotal;
        
        const itemDiv = document.createElement('div');
        itemDiv.className = 'invoice-item';
        
        let typeLabel = '';
        if (item.isCombo) {
            typeLabel = '<span style="background: var(--pastel-lavender); padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-left: 8px;">COMBO</span>';
        }
        
        itemDiv.innerHTML = `
            <div>
                <strong>${item.name}</strong> ${qty > 1 ? `x${qty}` : ''}${typeLabel}
                ${item.price !== item.originalPrice ? `<div style="font-size: 12px; color: var(--text-medium);">Discounted from $${item.originalPrice.toFixed(2)}</div>` : ''}
            </div>
            <div style="text-align: right;">
                <strong>$${itemTotal.toFixed(2)}</strong>
                ${qty > 1 ? `<div style="font-size: 12px; color: var(--text-medium);">$${item.price.toFixed(2)} each</div>` : ''}
            </div>
        `;
        itemsContainer.appendChild(itemDiv);
    });
    
    // Calculate totals
    const preTaxTotal = getPreTaxPrice(total);
    const taxTotal = getTaxAmount(total);
    
    document.getElementById('invoice-subtotal').textContent = `$${preTaxTotal.toFixed(2)}`;
    document.getElementById('invoice-tax').textContent = `$${taxTotal.toFixed(2)}`;
    document.getElementById('invoice-total').textContent = `$${total.toFixed(2)}`;
    
    openModal('invoice-modal');
}

// Email invoice
function emailInvoice() {
    const email = document.getElementById('invoice-email').value.trim();
    
    if (!email) {
        alert('Please enter an email address');
        return;
    }
    
    if (!lastSaleData) {
        alert('No invoice data available');
        return;
    }
    
    // Calculate totals
    let total = 0;
    lastSaleData.items.forEach(item => {
        const qty = item.quantity || 1;
        total += item.price * qty;
    });
    const preTaxTotal = getPreTaxPrice(total);
    const taxTotal = getTaxAmount(total);
    
    // Create email content
    let itemsList = '';
    lastSaleData.items.forEach(item => {
        const qty = item.quantity || 1;
        const itemTotal = item.price * qty;
        itemsList += `${item.name} ${qty > 1 ? `(x${qty})` : ''}: $${itemTotal.toFixed(2)}\n`;
    });
    
    const emailContent = `
Arunima G Studio Invoice
Date: ${new Date(lastSaleData.timestamp).toLocaleString()}

Items:
${itemsList}

Subtotal (Pre-Tax): $${preTaxTotal.toFixed(2)}
Tax (10.2%): $${taxTotal.toFixed(2)}
Total: $${total.toFixed(2)}

All prices include 10.2% sales tax.

Thank you for your purchase!
    `;
    
    // EmailJS parameters
    const templateParams = {
        email: email,
        subject: 'Thank you for your purchase - ' + new Date(lastSaleData.timestamp).toLocaleDateString().replace(/\//g, '-'),
        message: emailContent
    };
    
    // Note: User needs to set up EmailJS account and replace these values
    // Service ID, Template ID, and Public Key from EmailJS dashboard
    
    // Use config from window.APP_CONFIG (populated from URL params or defaults in index.html)
    const serviceId = (window.APP_CONFIG && window.APP_CONFIG.emailjsServiceId) || '';
    const templateId = (window.APP_CONFIG && window.APP_CONFIG.emailjsTemplateId) || '';

    if (!serviceId || !templateId) {
        alert('EmailJS configuration missing. Please provide service_id and template_id in URL parameters.');
        return;
    }

    emailjs.send(serviceId, templateId, templateParams)
        .then(function(response) {
            alert('Invoice sent successfully to ' + email);
            document.getElementById('invoice-email').value = '';
        }, function(error) {
            alert('Failed to send email: ' + error.text);
        });
}

// Initialize
loadData();
