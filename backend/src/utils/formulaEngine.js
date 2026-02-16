function evaluateFormula(formula, cells) {
    // Remove "="
    let expr = formula.slice(1);

    // Replace cell references like A1, B2 with actual values
    expr = expr.replace(/[A-Z]+[0-9]+/g, (ref) => {
        return Number(cells.get(ref)?.value || 0);
    });

    try {
        return Function("return " + expr)();
    } catch (err) {
        return "ERROR";
    }
}

module.exports = evaluateFormula;
