/* DeskCalc — simple calculator */
(function () {
    'use strict';

    const resultInput = document.getElementById('result');
    const exprPreview = document.getElementById('exprPreview');
    const statusText = document.getElementById('statusText');

    let expr = '';
    let justEvaluated = false;

    function pretty(s) {
        return String(s)
            .replace(/\*\*/g, '^')
            .replace(/\*/g, '×')
            .replace(/\//g, '÷')
            .replace(/sqrt\(/g, '√(');
    }

    function render() {
        if (expr === '') {
            resultInput.value = '0';
            exprPreview.textContent = '';
        } else {
            resultInput.value = pretty(expr);
        }
    }

    function setStatus(t) { statusText.textContent = t; }

    const OPERATORS = new Set(['+', '-', '*', '/', '%']);
    function isOperator(v) { return OPERATORS.has(v); }

    function lastChar() { return expr.length ? expr[expr.length - 1] : ''; }

    function appendValue(value) {
        if (justEvaluated) {
            if (!isOperator(value)) expr = '';
            justEvaluated = false;
        }

        if (value === '.') {
            const m = expr.match(/(\d+\.?\d*)$/);
            if (m && m[0].includes('.')) return;
            if (expr === '' || isOperator(lastChar()) || lastChar() === '(') {
                expr += '0.';
                render(); return;
            }
        }

        if (isOperator(value)) {
            if (expr === '' && value === '-') {
                expr += value; render(); return;
            }
            if (expr === '') return;
            if (isOperator(lastChar())) {
                expr = expr.slice(0, -1) + value;
                render(); return;
            }
        }

        expr += value;
        render();
    }

    function clearDisplay() {
        expr = '';
        justEvaluated = false;
        render();
        setStatus('Cleared');
        setTimeout(() => setStatus('Ready'), 900);
    }

    function clearEntry() {
        expr = expr.replace(/(\d+\.?\d*|\.\d+)$/, '');
        render();
    }

    function backspace() {
        if (justEvaluated) { clearDisplay(); return; }
        expr = expr.replace(/sqrt\($/, '');
        if (expr.length) expr = expr.slice(0, -1);
        render();
    }

    /* ---------- safe evaluation ---------- */
    function tokenize(s) {
        const tokens = [];
        let i = 0;
        while (i < s.length) {
            const c = s[i];
            if (/\s/.test(c)) { i++; continue; }
            if (/[0-9.]/.test(c)) {
                let j = i;
                while (j < s.length && /[0-9.]/.test(s[j])) j++;
                tokens.push({ type: 'num', value: s.slice(i, j) });
                i = j; continue;
            }
            if (/[a-zA-Z]/.test(c)) {
                let j = i;
                while (j < s.length && /[a-zA-Z]/.test(s[j])) j++;
                tokens.push({ type: 'ident', value: s.slice(i, j) });
                i = j; continue;
            }
            if (c === '*' && s[i+1] === '*') { tokens.push({ type: 'op', value: '**' }); i += 2; continue; }
            if ('+-*/%()'.includes(c)) { tokens.push({ type: 'op', value: c }); i++; continue; }
            return null;
        }
        return tokens;
    }

    class Parser {
        constructor(tokens) { this.t = tokens; this.i = 0; }
        peek() { return this.t[this.i]; }
        next() { return this.t[this.i++]; }
        parse() {
            const v = this.expr();
            if (this.i !== this.t.length) return null;
            return v;
        }
        expr() {
            let v = this.term();
            if (v === null) return null;
            while (this.peek() && this.peek().type === 'op' && (this.peek().value === '+' || this.peek().value === '-')) {
                const op = this.next().value;
                const r = this.term();
                if (r === null) return null;
                v = op === '+' ? v + r : v - r;
            }
            return v;
        }
        term() {
            let v = this.factor();
            if (v === null) return null;
            while (this.peek() && this.peek().type === 'op' && (this.peek().value === '*' || this.peek().value === '/')) {
                const op = this.next().value;
                const r = this.factor();
                if (r === null) return null;
                v = op === '*' ? v * r : v / r;
            }
            return v;
        }
        factor() {
            if (this.peek() && this.peek().type === 'op' && (this.peek().value === '+' || this.peek().value === '-')) {
                const op = this.next().value;
                const v = this.factor();
                if (v === null) return null;
                return op === '-' ? -v : v;
            }
            let v = this.power();
            if (v === null) return null;
            while (this.peek() && this.peek().type === 'op' && this.peek().value === '%') {
                this.next();
                v = v / 100;
            }
            if (this.peek() && this.peek().type === 'op' && this.peek().value === '**') {
                this.next();
                const r = this.factor();
                if (r === null) return null;
                v = Math.pow(v, r);
            }
            return v;
        }
        power() { return this.primary(); }
        primary() {
            const tk = this.peek();
            if (!tk) return null;
            if (tk.type === 'num') {
                this.next();
                const n = Number(tk.value);
                if (isNaN(n)) return null;
                return n;
            }
            if (tk.type === 'op' && tk.value === '(') {
                this.next();
                const v = this.expr();
                if (v === null) return null;
                if (!this.peek() || this.peek().type !== 'op' || this.peek().value !== ')') return null;
                this.next();
                return v;
            }
            if (tk.type === 'ident') {
                const name = this.next().value;
                if (name === 'sqrt' && this.peek() && this.peek().type === 'op' && this.peek().value === '(') {
                    this.next();
                    const arg = this.expr();
                    if (arg === null) return null;
                    if (!this.peek() || this.peek().type !== 'op' || this.peek().value !== ')') return null;
                    this.next();
                    return Math.sqrt(arg);
                }
                return null;
            }
            return null;
        }
    }

    function safeEval(s) {
        if (!s || !s.trim()) return null;
        // auto-close unclosed parentheses
        let open = 0;
        for (const ch of s) {
            if (ch === '(') open++;
            else if (ch === ')') open--;
        }
        let e = s;
        while (open > 0) { e += ')'; open--; }
        const toks = tokenize(e);
        if (!toks) return null;
        const p = new Parser(toks);
        const v = p.parse();
        if (typeof v !== 'number' || isNaN(v)) return null;
        return v;
    }

    function formatResult(v) {
        if (!isFinite(v)) return 'Error';
        let r = Math.round(v * 1e10) / 1e10;
        if (r === 0) r = 0;
        if (Math.abs(r) >= 1e15 || (Math.abs(r) > 0 && Math.abs(r) < 1e-10)) {
            return r.toExponential(6);
        }
        return String(r);
    }

    function calculate() {
        const v = safeEval(expr);
        if (v === null) {
            resultInput.value = 'Error';
            setStatus('Invalid expression');
            setTimeout(() => { render(); setStatus('Ready'); }, 1200);
            return;
        }
        if (!isFinite(v)) {
            resultInput.value = 'Error';
            setStatus('Math error');
            setTimeout(() => { render(); setStatus('Ready'); }, 1200);
            return;
        }
        const resStr = formatResult(v);
        expr = resStr;
        justEvaluated = true;
        render();
        setStatus('Computed');
        setTimeout(() => setStatus('Ready'), 900);
    }

    /* ---------- wiring ---------- */
    document.querySelectorAll('[data-value]').forEach(btn => {
        btn.addEventListener('click', () => {
            appendValue(btn.getAttribute('data-value'));
        });
    });
    document.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
            const a = btn.getAttribute('data-action');
            if (a === 'clear') clearDisplay();
            else if (a === 'ce') clearEntry();
            else if (a === 'backspace') backspace();
            else if (a === 'equals') calculate();
        });
    });

    document.addEventListener('keydown', (e) => {
        const k = e.key;
        if (/^[0-9]$/.test(k)) { appendValue(k); e.preventDefault(); return; }
        if (k === '+') { appendValue('+'); e.preventDefault(); return; }
        if (k === '-') { appendValue('-'); e.preventDefault(); return; }
        if (k === '*') { appendValue('*'); e.preventDefault(); return; }
        if (k === '/') { appendValue('/'); e.preventDefault(); return; }
        if (k === '%') { appendValue('%'); e.preventDefault(); return; }
        if (k === '.') { appendValue('.'); e.preventDefault(); return; }
        if (k === '(') { appendValue('('); e.preventDefault(); return; }
        if (k === ')') { appendValue(')'); e.preventDefault(); return; }
        if (k === '^') { appendValue('**'); e.preventDefault(); return; }
        if (k === 'Enter' || k === '=') { calculate(); e.preventDefault(); return; }
        if (k === 'Backspace') { backspace(); e.preventDefault(); return; }
        if (k === 'Escape') { clearDisplay(); e.preventDefault(); return; }
        if (k === 'Delete') { clearEntry(); e.preventDefault(); return; }
    });

    render();
})();
