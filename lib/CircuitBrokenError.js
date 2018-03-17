'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (call && (typeof call === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _gPO(o) { _gPO = Object.getPrototypeOf || function _gPO(o) { return o.__proto__; }; return _gPO(o); }

function _sPO(o, p) { _sPO = Object.setPrototypeOf || function _sPO(o, p) { o.__proto__ = p; return o; }; return _sPO(o, p); }

function _construct(Parent, args, Class) { _construct = typeof Reflect === "object" && Reflect.construct || function _construct(Parent, args, Class) { var Constructor, a = [null]; a.push.apply(a, args); Constructor = Parent.bind.apply(Parent, a); return _sPO(new Constructor(), Class.prototype); }; return _construct(Parent, args, Class); }

function _wrapNativeSuper(Class) { var _cache = typeof Map === "function" ? new Map() : undefined; _wrapNativeSuper = function _wrapNativeSuper(Class) { if (typeof Class !== "function") { throw new TypeError("Super expression must either be null or a function"); } if (typeof _cache !== "undefined") { if (_cache.has(Class)) return _cache.get(Class); _cache.set(Class, Wrapper); } function Wrapper() {} Wrapper.prototype = Object.create(Class.prototype, { constructor: { value: Wrapper, enumerable: false, writable: true, configurable: true } }); return _sPO(Wrapper, _sPO(function Super() { return _construct(Class, arguments, _gPO(this).constructor); }, Class)); }; return _wrapNativeSuper(Class); }

var consts = require('./consts');

var CircuitBrokenError =
/*#__PURE__*/
function (_Error) {
  _inherits(CircuitBrokenError, _Error);

  function CircuitBrokenError(name, totals, threshold) {
    var _this;

    _classCallCheck(this, CircuitBrokenError);

    _this = _possibleConstructorReturn(this, (CircuitBrokenError.__proto__ || Object.getPrototypeOf(CircuitBrokenError)).call(this));
    var prefix = '';

    if (name) {
      prefix = `[Breaker: ${name}] `;
    }

    _this.message = `${prefix}${consts.CIRCUIT_OPENED} - The percentage of failed requests (${Math.floor((1 - totals.successful / totals.total) * 100)}%) is greater than the threshold specified (${threshold * 100}%)`;
    _this.totals = totals;
    _this.name = name;
    return _this;
  }

  return CircuitBrokenError;
}(_wrapNativeSuper(Error));

module.exports = CircuitBrokenError;