const resultInput = document.getElementById('result');

function appendValue(value) {
    resultInput.value += value;
}

function clearDisplay() {
    resultInput.value = '';
}

function backspace() {
    resultInput.value = resultInput.value.slice(0, -1);
}

function calculate() {
    try {
        let expression = resultInput.value;
        
        // Handle square root: sqrt(number)
        // We'll use a simple regex to replace sqrt(x) with Math.sqrt(x)
        expression = expression.replace(/sqrt\(([^)]+)\)/g, 'Math.sqrt($1)');
        
        // Handle percentage: x% becomes x/100
        expression = expression.replace(/(\d+)%/g, '($1/100)');

        // Evaluate the expression
        // Note: eval() is used here for simplicity in a prototype. 
        // In a production app, a safer math parser would be preferred.
        const result = eval(expression);
        
        if (result === Infinity || isNaN(result)) {
            resultInput.value = 'Error';
        } else {
            // Round to 8 decimal places to avoid floating point issues
            resultInput.value = Math.round(result * 100000000) / 100000000;
        }
    } catch (error) {
        resultInput.value = 'Error';
    }
}

// Add keyboard support
document.addEventListener('keydown', (event) => {
    const key = event.key;
    if (/[0-9]/.test(key)) {
        appendValue(key);
    } else if (key === '+' || key === '-' || key === '*' || key === '/') {
        appendValue(key);
    } else if (key === '.') {
        appendValue('.');
    } else if (key === 'Enter' || key === '=') {
        calculate();
    } else if (key === 'Backspace') {
        backspace();
    } else if (key === 'Escape') {
        clearDisplay();
    }
});
