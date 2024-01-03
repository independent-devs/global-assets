class EventListener {
  constructor(e, t, r) {
    (this.eventTarget = e),
      (this.eventName = t),
      (this.eventOptions = r),
      (this.unorderedBindings = new Set());
  }
  connect() {
    this.eventTarget.addEventListener(this.eventName, this, this.eventOptions);
  }
  disconnect() {
    this.eventTarget.removeEventListener(
      this.eventName,
      this,
      this.eventOptions
    );
  }
  bindingConnected(e) {
    this.unorderedBindings.add(e);
  }
  bindingDisconnected(e) {
    this.unorderedBindings.delete(e);
  }
  handleEvent(e) {
    let t = extendEvent(e);
    for (let r of this.bindings) {
      if (t.immediatePropagationStopped) break;
      r.handleEvent(t);
    }
  }
  hasBindings() {
    return this.unorderedBindings.size > 0;
  }
  get bindings() {
    return Array.from(this.unorderedBindings).sort((e, t) => {
      let r = e.index,
        s = t.index;
      return r < s ? -1 : r > s ? 1 : 0;
    });
  }
}
function extendEvent(e) {
  if ("immediatePropagationStopped" in e) return e;
  {
    let { stopImmediatePropagation: t } = e;
    return Object.assign(e, {
      immediatePropagationStopped: !1,
      stopImmediatePropagation() {
        (this.immediatePropagationStopped = !0), t.call(this);
      },
    });
  }
}
class Dispatcher {
  constructor(e) {
    (this.application = e),
      (this.eventListenerMaps = new Map()),
      (this.started = !1);
  }
  start() {
    this.started ||
      ((this.started = !0), this.eventListeners.forEach((e) => e.connect()));
  }
  stop() {
    this.started &&
      ((this.started = !1), this.eventListeners.forEach((e) => e.disconnect()));
  }
  get eventListeners() {
    return Array.from(this.eventListenerMaps.values()).reduce(
      (e, t) => e.concat(Array.from(t.values())),
      []
    );
  }
  bindingConnected(e) {
    this.fetchEventListenerForBinding(e).bindingConnected(e);
  }
  bindingDisconnected(e, t = !1) {
    this.fetchEventListenerForBinding(e).bindingDisconnected(e),
      t && this.clearEventListenersForBinding(e);
  }
  handleError(e, t, r = {}) {
    this.application.handleError(e, `Error ${t}`, r);
  }
  clearEventListenersForBinding(e) {
    let t = this.fetchEventListenerForBinding(e);
    t.hasBindings() || (t.disconnect(), this.removeMappedEventListenerFor(e));
  }
  removeMappedEventListenerFor(e) {
    let { eventTarget: t, eventName: r, eventOptions: s } = e,
      i = this.fetchEventListenerMapForEventTarget(t),
      n = this.cacheKey(r, s);
    i.delete(n), 0 == i.size && this.eventListenerMaps.delete(t);
  }
  fetchEventListenerForBinding(e) {
    let { eventTarget: t, eventName: r, eventOptions: s } = e;
    return this.fetchEventListener(t, r, s);
  }
  fetchEventListener(e, t, r) {
    let s = this.fetchEventListenerMapForEventTarget(e),
      i = this.cacheKey(t, r),
      n = s.get(i);
    return n || ((n = this.createEventListener(e, t, r)), s.set(i, n)), n;
  }
  createEventListener(e, t, r) {
    let s = new EventListener(e, t, r);
    return this.started && s.connect(), s;
  }
  fetchEventListenerMapForEventTarget(e) {
    let t = this.eventListenerMaps.get(e);
    return t || ((t = new Map()), this.eventListenerMaps.set(e, t)), t;
  }
  cacheKey(e, t) {
    let r = [e];
    return (
      Object.keys(t)
        .sort()
        .forEach((e) => {
          r.push(`${t[e] ? "" : "!"}${e}`);
        }),
      r.join(":")
    );
  }
}
let defaultActionDescriptorFilters = {
    stop: ({ event: e, value: t }) => (t && e.stopPropagation(), !0),
    prevent: ({ event: e, value: t }) => (t && e.preventDefault(), !0),
    self: ({ event: e, value: t, element: r }) => !t || r === e.target,
  },
  descriptorPattern =
    /^(?:(?:([^.]+?)\+)?(.+?)(?:\.(.+?))?(?:@(window|document))?->)?(.+?)(?:#([^:]+?))(?::(.+))?$/;
function parseActionDescriptorString(e) {
  let t = e.trim(),
    r = t.match(descriptorPattern) || [],
    s = r[2],
    i = r[3];
  return (
    i &&
      !["keydown", "keyup", "keypress"].includes(s) &&
      ((s += `.${i}`), (i = "")),
    {
      eventTarget: parseEventTarget(r[4]),
      eventName: s,
      eventOptions: r[7] ? parseEventOptions(r[7]) : {},
      identifier: r[5],
      methodName: r[6],
      keyFilter: r[1] || i,
    }
  );
}
function parseEventTarget(e) {
  return "window" == e ? window : "document" == e ? document : void 0;
}
function parseEventOptions(e) {
  return e
    .split(":")
    .reduce(
      (e, t) => Object.assign(e, { [t.replace(/^!/, "")]: !/^!/.test(t) }),
      {}
    );
}
function stringifyEventTarget(e) {
  return e == window ? "window" : e == document ? "document" : void 0;
}
function camelize(e) {
  return e.replace(/(?:[_-])([a-z0-9])/g, (e, t) => t.toUpperCase());
}
function namespaceCamelize(e) {
  return camelize(e.replace(/--/g, "-").replace(/__/g, "_"));
}
function capitalize(e) {
  return e.charAt(0).toUpperCase() + e.slice(1);
}
function dasherize(e) {
  return e.replace(/([A-Z])/g, (e, t) => `-${t.toLowerCase()}`);
}
function tokenize(e) {
  return e.match(/[^\s]+/g) || [];
}
function isSomething(e) {
  return null != e;
}
function hasProperty(e, t) {
  return Object.prototype.hasOwnProperty.call(e, t);
}
let allModifiers = ["meta", "ctrl", "alt", "shift"];
class Action {
  constructor(e, t, r, s) {
    (this.element = e),
      (this.index = t),
      (this.eventTarget = r.eventTarget || e),
      (this.eventName =
        r.eventName ||
        getDefaultEventNameForElement(e) ||
        error("missing event name")),
      (this.eventOptions = r.eventOptions || {}),
      (this.identifier = r.identifier || error("missing identifier")),
      (this.methodName = r.methodName || error("missing method name")),
      (this.keyFilter = r.keyFilter || ""),
      (this.schema = s);
  }
  static forToken(e, t) {
    return new this(
      e.element,
      e.index,
      parseActionDescriptorString(e.content),
      t
    );
  }
  toString() {
    let e = this.keyFilter ? `.${this.keyFilter}` : "",
      t = this.eventTargetName ? `@${this.eventTargetName}` : "";
    return `${this.eventName}${e}${t}->${this.identifier}#${this.methodName}`;
  }
  shouldIgnoreKeyboardEvent(e) {
    if (!this.keyFilter) return !1;
    let t = this.keyFilter.split("+");
    if (this.keyFilterDissatisfied(e, t)) return !0;
    let r = t.filter((e) => !allModifiers.includes(e))[0];
    return (
      !!r &&
      (hasProperty(this.keyMappings, r) ||
        error(`contains unknown key filter: ${this.keyFilter}`),
      this.keyMappings[r].toLowerCase() !== e.key.toLowerCase())
    );
  }
  shouldIgnoreMouseEvent(e) {
    if (!this.keyFilter) return !1;
    let t = [this.keyFilter];
    return !!this.keyFilterDissatisfied(e, t);
  }
  get params() {
    let e = {},
      t = RegExp(`^data-${this.identifier}-(.+)-param$`, "i");
    for (let { name: r, value: s } of Array.from(this.element.attributes)) {
      let i = r.match(t),
        n = i && i[1];
      n && (e[camelize(n)] = typecast(s));
    }
    return e;
  }
  get eventTargetName() {
    return stringifyEventTarget(this.eventTarget);
  }
  get keyMappings() {
    return this.schema.keyMappings;
  }
  keyFilterDissatisfied(e, t) {
    let [r, s, i, n] = allModifiers.map((e) => t.includes(e));
    return (
      e.metaKey !== r || e.ctrlKey !== s || e.altKey !== i || e.shiftKey !== n
    );
  }
}
let defaultEventNames = {
  a: () => "click",
  button: () => "click",
  form: () => "submit",
  details: () => "toggle",
  input: (e) => ("submit" == e.getAttribute("type") ? "click" : "input"),
  select: () => "change",
  textarea: () => "input",
};
function getDefaultEventNameForElement(e) {
  let t = e.tagName.toLowerCase();
  if (t in defaultEventNames) return defaultEventNames[t](e);
}
function error(e) {
  throw Error(e);
}
function typecast(e) {
  try {
    return JSON.parse(e);
  } catch (t) {
    return e;
  }
}
class Binding {
  constructor(e, t) {
    (this.context = e), (this.action = t);
  }
  get index() {
    return this.action.index;
  }
  get eventTarget() {
    return this.action.eventTarget;
  }
  get eventOptions() {
    return this.action.eventOptions;
  }
  get identifier() {
    return this.context.identifier;
  }
  handleEvent(e) {
    let t = this.prepareActionEvent(e);
    this.willBeInvokedByEvent(e) &&
      this.applyEventModifiers(t) &&
      this.invokeWithEvent(t);
  }
  get eventName() {
    return this.action.eventName;
  }
  get method() {
    let e = this.controller[this.methodName];
    if ("function" == typeof e) return e;
    throw Error(
      `Action "${this.action}" references undefined method "${this.methodName}"`
    );
  }
  applyEventModifiers(e) {
    let { element: t } = this.action,
      { actionDescriptorFilters: r } = this.context.application,
      { controller: s } = this.context,
      i = !0;
    for (let [n, o] of Object.entries(this.eventOptions))
      if (n in r) {
        let a = r[n];
        i = i && a({ name: n, value: o, event: e, element: t, controller: s });
      }
    return i;
  }
  prepareActionEvent(e) {
    return Object.assign(e, { params: this.action.params });
  }
  invokeWithEvent(e) {
    let { target: t, currentTarget: r } = e;
    try {
      this.method.call(this.controller, e),
        this.context.logDebugActivity(this.methodName, {
          event: e,
          target: t,
          currentTarget: r,
          action: this.methodName,
        });
    } catch (s) {
      let { identifier: i, controller: n, element: o, index: a } = this;
      this.context.handleError(s, `invoking action "${this.action}"`, {
        identifier: i,
        controller: n,
        element: o,
        index: a,
        event: e,
      });
    }
  }
  willBeInvokedByEvent(e) {
    let t = e.target;
    return (
      !(
        (e instanceof KeyboardEvent &&
          this.action.shouldIgnoreKeyboardEvent(e)) ||
        (e instanceof MouseEvent && this.action.shouldIgnoreMouseEvent(e))
      ) &&
      (this.element === t ||
        (t instanceof Element && this.element.contains(t)
          ? this.scope.containsElement(t)
          : this.scope.containsElement(this.action.element)))
    );
  }
  get controller() {
    return this.context.controller;
  }
  get methodName() {
    return this.action.methodName;
  }
  get element() {
    return this.scope.element;
  }
  get scope() {
    return this.context.scope;
  }
}
class ElementObserver {
  constructor(e, t) {
    (this.mutationObserverInit = {
      attributes: !0,
      childList: !0,
      subtree: !0,
    }),
      (this.element = e),
      (this.started = !1),
      (this.delegate = t),
      (this.elements = new Set()),
      (this.mutationObserver = new MutationObserver((e) =>
        this.processMutations(e)
      ));
  }
  start() {
    this.started ||
      ((this.started = !0),
      this.mutationObserver.observe(this.element, this.mutationObserverInit),
      this.refresh());
  }
  pause(e) {
    this.started && (this.mutationObserver.disconnect(), (this.started = !1)),
      e(),
      this.started ||
        (this.mutationObserver.observe(this.element, this.mutationObserverInit),
        (this.started = !0));
  }
  stop() {
    this.started &&
      (this.mutationObserver.takeRecords(),
      this.mutationObserver.disconnect(),
      (this.started = !1));
  }
  refresh() {
    if (this.started) {
      let e = new Set(this.matchElementsInTree());
      for (let t of Array.from(this.elements))
        e.has(t) || this.removeElement(t);
      for (let r of Array.from(e)) this.addElement(r);
    }
  }
  processMutations(e) {
    if (this.started) for (let t of e) this.processMutation(t);
  }
  processMutation(e) {
    "attributes" == e.type
      ? this.processAttributeChange(e.target, e.attributeName)
      : "childList" == e.type &&
        (this.processRemovedNodes(e.removedNodes),
        this.processAddedNodes(e.addedNodes));
  }
  processAttributeChange(e, t) {
    this.elements.has(e)
      ? this.delegate.elementAttributeChanged && this.matchElement(e)
        ? this.delegate.elementAttributeChanged(e, t)
        : this.removeElement(e)
      : this.matchElement(e) && this.addElement(e);
  }
  processRemovedNodes(e) {
    for (let t of Array.from(e)) {
      let r = this.elementFromNode(t);
      r && this.processTree(r, this.removeElement);
    }
  }
  processAddedNodes(e) {
    for (let t of Array.from(e)) {
      let r = this.elementFromNode(t);
      r && this.elementIsActive(r) && this.processTree(r, this.addElement);
    }
  }
  matchElement(e) {
    return this.delegate.matchElement(e);
  }
  matchElementsInTree(e = this.element) {
    return this.delegate.matchElementsInTree(e);
  }
  processTree(e, t) {
    for (let r of this.matchElementsInTree(e)) t.call(this, r);
  }
  elementFromNode(e) {
    if (e.nodeType == Node.ELEMENT_NODE) return e;
  }
  elementIsActive(e) {
    return (
      e.isConnected == this.element.isConnected && this.element.contains(e)
    );
  }
  addElement(e) {
    !this.elements.has(e) &&
      this.elementIsActive(e) &&
      (this.elements.add(e),
      this.delegate.elementMatched && this.delegate.elementMatched(e));
  }
  removeElement(e) {
    this.elements.has(e) &&
      (this.elements.delete(e),
      this.delegate.elementUnmatched && this.delegate.elementUnmatched(e));
  }
}
class AttributeObserver {
  constructor(e, t, r) {
    (this.attributeName = t),
      (this.delegate = r),
      (this.elementObserver = new ElementObserver(e, this));
  }
  get element() {
    return this.elementObserver.element;
  }
  get selector() {
    return `[${this.attributeName}]`;
  }
  start() {
    this.elementObserver.start();
  }
  pause(e) {
    this.elementObserver.pause(e);
  }
  stop() {
    this.elementObserver.stop();
  }
  refresh() {
    this.elementObserver.refresh();
  }
  get started() {
    return this.elementObserver.started;
  }
  matchElement(e) {
    return e.hasAttribute(this.attributeName);
  }
  matchElementsInTree(e) {
    let t = this.matchElement(e) ? [e] : [],
      r = Array.from(e.querySelectorAll(this.selector));
    return t.concat(r);
  }
  elementMatched(e) {
    this.delegate.elementMatchedAttribute &&
      this.delegate.elementMatchedAttribute(e, this.attributeName);
  }
  elementUnmatched(e) {
    this.delegate.elementUnmatchedAttribute &&
      this.delegate.elementUnmatchedAttribute(e, this.attributeName);
  }
  elementAttributeChanged(e, t) {
    this.delegate.elementAttributeValueChanged &&
      this.attributeName == t &&
      this.delegate.elementAttributeValueChanged(e, t);
  }
}
function add(e, t, r) {
  fetch(e, t).add(r);
}
function del(e, t, r) {
  fetch(e, t).delete(r), prune(e, t);
}
function fetch(e, t) {
  let r = e.get(t);
  return r || ((r = new Set()), e.set(t, r)), r;
}
function prune(e, t) {
  let r = e.get(t);
  null != r && 0 == r.size && e.delete(t);
}
class Multimap {
  constructor() {
    this.valuesByKey = new Map();
  }
  get keys() {
    return Array.from(this.valuesByKey.keys());
  }
  get values() {
    let e = Array.from(this.valuesByKey.values());
    return e.reduce((e, t) => e.concat(Array.from(t)), []);
  }
  get size() {
    let e = Array.from(this.valuesByKey.values());
    return e.reduce((e, t) => e + t.size, 0);
  }
  add(e, t) {
    add(this.valuesByKey, e, t);
  }
  delete(e, t) {
    del(this.valuesByKey, e, t);
  }
  has(e, t) {
    let r = this.valuesByKey.get(e);
    return null != r && r.has(t);
  }
  hasKey(e) {
    return this.valuesByKey.has(e);
  }
  hasValue(e) {
    let t = Array.from(this.valuesByKey.values());
    return t.some((t) => t.has(e));
  }
  getValuesForKey(e) {
    let t = this.valuesByKey.get(e);
    return t ? Array.from(t) : [];
  }
  getKeysForValue(e) {
    return Array.from(this.valuesByKey)
      .filter(([t, r]) => r.has(e))
      .map(([e, t]) => e);
  }
}
class IndexedMultimap extends Multimap {
  constructor() {
    super(), (this.keysByValue = new Map());
  }
  get values() {
    return Array.from(this.keysByValue.keys());
  }
  add(e, t) {
    super.add(e, t), add(this.keysByValue, t, e);
  }
  delete(e, t) {
    super.delete(e, t), del(this.keysByValue, t, e);
  }
  hasValue(e) {
    return this.keysByValue.has(e);
  }
  getKeysForValue(e) {
    let t = this.keysByValue.get(e);
    return t ? Array.from(t) : [];
  }
}
class SelectorObserver {
  constructor(e, t, r, s) {
    (this._selector = t),
      (this.details = s),
      (this.elementObserver = new ElementObserver(e, this)),
      (this.delegate = r),
      (this.matchesByElement = new Multimap());
  }
  get started() {
    return this.elementObserver.started;
  }
  get selector() {
    return this._selector;
  }
  set selector(e) {
    (this._selector = e), this.refresh();
  }
  start() {
    this.elementObserver.start();
  }
  pause(e) {
    this.elementObserver.pause(e);
  }
  stop() {
    this.elementObserver.stop();
  }
  refresh() {
    this.elementObserver.refresh();
  }
  get element() {
    return this.elementObserver.element;
  }
  matchElement(e) {
    let { selector: t } = this;
    if (!t) return !1;
    {
      let r = e.matches(t);
      return this.delegate.selectorMatchElement
        ? r && this.delegate.selectorMatchElement(e, this.details)
        : r;
    }
  }
  matchElementsInTree(e) {
    let { selector: t } = this;
    if (!t) return [];
    {
      let r = this.matchElement(e) ? [e] : [],
        s = Array.from(e.querySelectorAll(t)).filter((e) =>
          this.matchElement(e)
        );
      return r.concat(s);
    }
  }
  elementMatched(e) {
    let { selector: t } = this;
    t && this.selectorMatched(e, t);
  }
  elementUnmatched(e) {
    let t = this.matchesByElement.getKeysForValue(e);
    for (let r of t) this.selectorUnmatched(e, r);
  }
  elementAttributeChanged(e, t) {
    let { selector: r } = this;
    if (r) {
      let s = this.matchElement(e),
        i = this.matchesByElement.has(r, e);
      s && !i
        ? this.selectorMatched(e, r)
        : !s && i && this.selectorUnmatched(e, r);
    }
  }
  selectorMatched(e, t) {
    this.delegate.selectorMatched(e, t, this.details),
      this.matchesByElement.add(t, e);
  }
  selectorUnmatched(e, t) {
    this.delegate.selectorUnmatched(e, t, this.details),
      this.matchesByElement.delete(t, e);
  }
}
class StringMapObserver {
  constructor(e, t) {
    (this.element = e),
      (this.delegate = t),
      (this.started = !1),
      (this.stringMap = new Map()),
      (this.mutationObserver = new MutationObserver((e) =>
        this.processMutations(e)
      ));
  }
  start() {
    this.started ||
      ((this.started = !0),
      this.mutationObserver.observe(this.element, {
        attributes: !0,
        attributeOldValue: !0,
      }),
      this.refresh());
  }
  stop() {
    this.started &&
      (this.mutationObserver.takeRecords(),
      this.mutationObserver.disconnect(),
      (this.started = !1));
  }
  refresh() {
    if (this.started)
      for (let e of this.knownAttributeNames) this.refreshAttribute(e, null);
  }
  processMutations(e) {
    if (this.started) for (let t of e) this.processMutation(t);
  }
  processMutation(e) {
    let t = e.attributeName;
    t && this.refreshAttribute(t, e.oldValue);
  }
  refreshAttribute(e, t) {
    let r = this.delegate.getStringMapKeyForAttribute(e);
    if (null != r) {
      this.stringMap.has(e) || this.stringMapKeyAdded(r, e);
      let s = this.element.getAttribute(e);
      if (
        (this.stringMap.get(e) != s && this.stringMapValueChanged(s, r, t),
        null == s)
      ) {
        let i = this.stringMap.get(e);
        this.stringMap.delete(e), i && this.stringMapKeyRemoved(r, e, i);
      } else this.stringMap.set(e, s);
    }
  }
  stringMapKeyAdded(e, t) {
    this.delegate.stringMapKeyAdded && this.delegate.stringMapKeyAdded(e, t);
  }
  stringMapValueChanged(e, t, r) {
    this.delegate.stringMapValueChanged &&
      this.delegate.stringMapValueChanged(e, t, r);
  }
  stringMapKeyRemoved(e, t, r) {
    this.delegate.stringMapKeyRemoved &&
      this.delegate.stringMapKeyRemoved(e, t, r);
  }
  get knownAttributeNames() {
    return Array.from(
      new Set(this.currentAttributeNames.concat(this.recordedAttributeNames))
    );
  }
  get currentAttributeNames() {
    return Array.from(this.element.attributes).map((e) => e.name);
  }
  get recordedAttributeNames() {
    return Array.from(this.stringMap.keys());
  }
}
class TokenListObserver {
  constructor(e, t, r) {
    (this.attributeObserver = new AttributeObserver(e, t, this)),
      (this.delegate = r),
      (this.tokensByElement = new Multimap());
  }
  get started() {
    return this.attributeObserver.started;
  }
  start() {
    this.attributeObserver.start();
  }
  pause(e) {
    this.attributeObserver.pause(e);
  }
  stop() {
    this.attributeObserver.stop();
  }
  refresh() {
    this.attributeObserver.refresh();
  }
  get element() {
    return this.attributeObserver.element;
  }
  get attributeName() {
    return this.attributeObserver.attributeName;
  }
  elementMatchedAttribute(e) {
    this.tokensMatched(this.readTokensForElement(e));
  }
  elementAttributeValueChanged(e) {
    let [t, r] = this.refreshTokensForElement(e);
    this.tokensUnmatched(t), this.tokensMatched(r);
  }
  elementUnmatchedAttribute(e) {
    this.tokensUnmatched(this.tokensByElement.getValuesForKey(e));
  }
  tokensMatched(e) {
    e.forEach((e) => this.tokenMatched(e));
  }
  tokensUnmatched(e) {
    e.forEach((e) => this.tokenUnmatched(e));
  }
  tokenMatched(e) {
    this.delegate.tokenMatched(e), this.tokensByElement.add(e.element, e);
  }
  tokenUnmatched(e) {
    this.delegate.tokenUnmatched(e), this.tokensByElement.delete(e.element, e);
  }
  refreshTokensForElement(e) {
    let t = this.tokensByElement.getValuesForKey(e),
      r = this.readTokensForElement(e),
      s = zip(t, r).findIndex(([e, t]) => !tokensAreEqual(e, t));
    return -1 == s ? [[], []] : [t.slice(s), r.slice(s)];
  }
  readTokensForElement(e) {
    let t = this.attributeName,
      r = e.getAttribute(t) || "";
    return parseTokenString(r, e, t);
  }
}
function parseTokenString(e, t, r) {
  return e
    .trim()
    .split(/\s+/)
    .filter((e) => e.length)
    .map((e, s) => ({ element: t, attributeName: r, content: e, index: s }));
}
function zip(e, t) {
  let r = Math.max(e.length, t.length);
  return Array.from({ length: r }, (r, s) => [e[s], t[s]]);
}
function tokensAreEqual(e, t) {
  return e && t && e.index == t.index && e.content == t.content;
}
class ValueListObserver {
  constructor(e, t, r) {
    (this.tokenListObserver = new TokenListObserver(e, t, this)),
      (this.delegate = r),
      (this.parseResultsByToken = new WeakMap()),
      (this.valuesByTokenByElement = new WeakMap());
  }
  get started() {
    return this.tokenListObserver.started;
  }
  start() {
    this.tokenListObserver.start();
  }
  stop() {
    this.tokenListObserver.stop();
  }
  refresh() {
    this.tokenListObserver.refresh();
  }
  get element() {
    return this.tokenListObserver.element;
  }
  get attributeName() {
    return this.tokenListObserver.attributeName;
  }
  tokenMatched(e) {
    let { element: t } = e,
      { value: r } = this.fetchParseResultForToken(e);
    r &&
      (this.fetchValuesByTokenForElement(t).set(e, r),
      this.delegate.elementMatchedValue(t, r));
  }
  tokenUnmatched(e) {
    let { element: t } = e,
      { value: r } = this.fetchParseResultForToken(e);
    r &&
      (this.fetchValuesByTokenForElement(t).delete(e),
      this.delegate.elementUnmatchedValue(t, r));
  }
  fetchParseResultForToken(e) {
    let t = this.parseResultsByToken.get(e);
    return (
      t || ((t = this.parseToken(e)), this.parseResultsByToken.set(e, t)), t
    );
  }
  fetchValuesByTokenForElement(e) {
    let t = this.valuesByTokenByElement.get(e);
    return t || ((t = new Map()), this.valuesByTokenByElement.set(e, t)), t;
  }
  parseToken(e) {
    try {
      let t = this.delegate.parseValueForToken(e);
      return { value: t };
    } catch (r) {
      return { error: r };
    }
  }
}
class BindingObserver {
  constructor(e, t) {
    (this.context = e),
      (this.delegate = t),
      (this.bindingsByAction = new Map());
  }
  start() {
    this.valueListObserver ||
      ((this.valueListObserver = new ValueListObserver(
        this.element,
        this.actionAttribute,
        this
      )),
      this.valueListObserver.start());
  }
  stop() {
    this.valueListObserver &&
      (this.valueListObserver.stop(),
      delete this.valueListObserver,
      this.disconnectAllActions());
  }
  get element() {
    return this.context.element;
  }
  get identifier() {
    return this.context.identifier;
  }
  get actionAttribute() {
    return this.schema.actionAttribute;
  }
  get schema() {
    return this.context.schema;
  }
  get bindings() {
    return Array.from(this.bindingsByAction.values());
  }
  connectAction(e) {
    let t = new Binding(this.context, e);
    this.bindingsByAction.set(e, t), this.delegate.bindingConnected(t);
  }
  disconnectAction(e) {
    let t = this.bindingsByAction.get(e);
    t &&
      (this.bindingsByAction.delete(e), this.delegate.bindingDisconnected(t));
  }
  disconnectAllActions() {
    this.bindings.forEach((e) => this.delegate.bindingDisconnected(e, !0)),
      this.bindingsByAction.clear();
  }
  parseValueForToken(e) {
    let t = Action.forToken(e, this.schema);
    if (t.identifier == this.identifier) return t;
  }
  elementMatchedValue(e, t) {
    this.connectAction(t);
  }
  elementUnmatchedValue(e, t) {
    this.disconnectAction(t);
  }
}
class ValueObserver {
  constructor(e, t) {
    (this.context = e),
      (this.receiver = t),
      (this.stringMapObserver = new StringMapObserver(this.element, this)),
      (this.valueDescriptorMap = this.controller.valueDescriptorMap);
  }
  start() {
    this.stringMapObserver.start(),
      this.invokeChangedCallbacksForDefaultValues();
  }
  stop() {
    this.stringMapObserver.stop();
  }
  get element() {
    return this.context.element;
  }
  get controller() {
    return this.context.controller;
  }
  getStringMapKeyForAttribute(e) {
    if (e in this.valueDescriptorMap) return this.valueDescriptorMap[e].name;
  }
  stringMapKeyAdded(e, t) {
    let r = this.valueDescriptorMap[t];
    this.hasValue(e) ||
      this.invokeChangedCallback(
        e,
        r.writer(this.receiver[e]),
        r.writer(r.defaultValue)
      );
  }
  stringMapValueChanged(e, t, r) {
    let s = this.valueDescriptorNameMap[t];
    null !== e &&
      (null === r && (r = s.writer(s.defaultValue)),
      this.invokeChangedCallback(t, e, r));
  }
  stringMapKeyRemoved(e, t, r) {
    let s = this.valueDescriptorNameMap[e];
    this.hasValue(e)
      ? this.invokeChangedCallback(e, s.writer(this.receiver[e]), r)
      : this.invokeChangedCallback(e, s.writer(s.defaultValue), r);
  }
  invokeChangedCallbacksForDefaultValues() {
    for (let { key: e, name: t, defaultValue: r, writer: s } of this
      .valueDescriptors)
      void 0 == r ||
        this.controller.data.has(e) ||
        this.invokeChangedCallback(t, s(r), void 0);
  }
  invokeChangedCallback(e, t, r) {
    let s = `${e}Changed`,
      i = this.receiver[s];
    if ("function" == typeof i) {
      let n = this.valueDescriptorNameMap[e];
      try {
        let o = n.reader(t),
          a = r;
        r && (a = n.reader(r)), i.call(this.receiver, o, a);
      } catch (l) {
        throw (
          (l instanceof TypeError &&
            (l.message = `Stimulus Value "${this.context.identifier}.${n.name}" - ${l.message}`),
          l)
        );
      }
    }
  }
  get valueDescriptors() {
    let { valueDescriptorMap: e } = this;
    return Object.keys(e).map((t) => e[t]);
  }
  get valueDescriptorNameMap() {
    let e = {};
    return (
      Object.keys(this.valueDescriptorMap).forEach((t) => {
        let r = this.valueDescriptorMap[t];
        e[r.name] = r;
      }),
      e
    );
  }
  hasValue(e) {
    let t = this.valueDescriptorNameMap[e],
      r = `has${capitalize(t.name)}`;
    return this.receiver[r];
  }
}
class TargetObserver {
  constructor(e, t) {
    (this.context = e),
      (this.delegate = t),
      (this.targetsByName = new Multimap());
  }
  start() {
    this.tokenListObserver ||
      ((this.tokenListObserver = new TokenListObserver(
        this.element,
        this.attributeName,
        this
      )),
      this.tokenListObserver.start());
  }
  stop() {
    this.tokenListObserver &&
      (this.disconnectAllTargets(),
      this.tokenListObserver.stop(),
      delete this.tokenListObserver);
  }
  tokenMatched({ element: e, content: t }) {
    this.scope.containsElement(e) && this.connectTarget(e, t);
  }
  tokenUnmatched({ element: e, content: t }) {
    this.disconnectTarget(e, t);
  }
  connectTarget(e, t) {
    var r;
    this.targetsByName.has(t, e) ||
      (this.targetsByName.add(t, e),
      null === (r = this.tokenListObserver) ||
        void 0 === r ||
        r.pause(() => this.delegate.targetConnected(e, t)));
  }
  disconnectTarget(e, t) {
    var r;
    this.targetsByName.has(t, e) &&
      (this.targetsByName.delete(t, e),
      null === (r = this.tokenListObserver) ||
        void 0 === r ||
        r.pause(() => this.delegate.targetDisconnected(e, t)));
  }
  disconnectAllTargets() {
    for (let e of this.targetsByName.keys)
      for (let t of this.targetsByName.getValuesForKey(e))
        this.disconnectTarget(t, e);
  }
  get attributeName() {
    return `data-${this.context.identifier}-target`;
  }
  get element() {
    return this.context.element;
  }
  get scope() {
    return this.context.scope;
  }
}
function readInheritableStaticArrayValues(e, t) {
  let r = getAncestorsForConstructor(e);
  return Array.from(
    r.reduce(
      (e, r) => (getOwnStaticArrayValues(r, t).forEach((t) => e.add(t)), e),
      new Set()
    )
  );
}
function readInheritableStaticObjectPairs(e, t) {
  let r = getAncestorsForConstructor(e);
  return r.reduce((e, r) => (e.push(...getOwnStaticObjectPairs(r, t)), e), []);
}
function getAncestorsForConstructor(e) {
  let t = [];
  for (; e; ) t.push(e), (e = Object.getPrototypeOf(e));
  return t.reverse();
}
function getOwnStaticArrayValues(e, t) {
  let r = e[t];
  return Array.isArray(r) ? r : [];
}
function getOwnStaticObjectPairs(e, t) {
  let r = e[t];
  return r ? Object.keys(r).map((e) => [e, r[e]]) : [];
}
class OutletObserver {
  constructor(e, t) {
    (this.started = !1),
      (this.context = e),
      (this.delegate = t),
      (this.outletsByName = new Multimap()),
      (this.outletElementsByName = new Multimap()),
      (this.selectorObserverMap = new Map()),
      (this.attributeObserverMap = new Map());
  }
  start() {
    this.started ||
      (this.outletDefinitions.forEach((e) => {
        this.setupSelectorObserverForOutlet(e),
          this.setupAttributeObserverForOutlet(e);
      }),
      (this.started = !0),
      this.dependentContexts.forEach((e) => e.refresh()));
  }
  refresh() {
    this.selectorObserverMap.forEach((e) => e.refresh()),
      this.attributeObserverMap.forEach((e) => e.refresh());
  }
  stop() {
    this.started &&
      ((this.started = !1),
      this.disconnectAllOutlets(),
      this.stopSelectorObservers(),
      this.stopAttributeObservers());
  }
  stopSelectorObservers() {
    this.selectorObserverMap.size > 0 &&
      (this.selectorObserverMap.forEach((e) => e.stop()),
      this.selectorObserverMap.clear());
  }
  stopAttributeObservers() {
    this.attributeObserverMap.size > 0 &&
      (this.attributeObserverMap.forEach((e) => e.stop()),
      this.attributeObserverMap.clear());
  }
  selectorMatched(e, t, { outletName: r }) {
    let s = this.getOutlet(e, r);
    s && this.connectOutlet(s, e, r);
  }
  selectorUnmatched(e, t, { outletName: r }) {
    let s = this.getOutletFromMap(e, r);
    s && this.disconnectOutlet(s, e, r);
  }
  selectorMatchElement(e, { outletName: t }) {
    let r = this.selector(t),
      s = this.hasOutlet(e, t),
      i = e.matches(`[${this.schema.controllerAttribute}~=${t}]`);
    return !!r && s && i && e.matches(r);
  }
  elementMatchedAttribute(e, t) {
    let r = this.getOutletNameFromOutletAttributeName(t);
    r && this.updateSelectorObserverForOutlet(r);
  }
  elementAttributeValueChanged(e, t) {
    let r = this.getOutletNameFromOutletAttributeName(t);
    r && this.updateSelectorObserverForOutlet(r);
  }
  elementUnmatchedAttribute(e, t) {
    let r = this.getOutletNameFromOutletAttributeName(t);
    r && this.updateSelectorObserverForOutlet(r);
  }
  connectOutlet(e, t, r) {
    var s;
    this.outletElementsByName.has(r, t) ||
      (this.outletsByName.add(r, e),
      this.outletElementsByName.add(r, t),
      null === (s = this.selectorObserverMap.get(r)) ||
        void 0 === s ||
        s.pause(() => this.delegate.outletConnected(e, t, r)));
  }
  disconnectOutlet(e, t, r) {
    var s;
    this.outletElementsByName.has(r, t) &&
      (this.outletsByName.delete(r, e),
      this.outletElementsByName.delete(r, t),
      null === (s = this.selectorObserverMap.get(r)) ||
        void 0 === s ||
        s.pause(() => this.delegate.outletDisconnected(e, t, r)));
  }
  disconnectAllOutlets() {
    for (let e of this.outletElementsByName.keys)
      for (let t of this.outletElementsByName.getValuesForKey(e))
        for (let r of this.outletsByName.getValuesForKey(e))
          this.disconnectOutlet(r, t, e);
  }
  updateSelectorObserverForOutlet(e) {
    let t = this.selectorObserverMap.get(e);
    t && (t.selector = this.selector(e));
  }
  setupSelectorObserverForOutlet(e) {
    let t = this.selector(e),
      r = new SelectorObserver(document.body, t, this, { outletName: e });
    this.selectorObserverMap.set(e, r), r.start();
  }
  setupAttributeObserverForOutlet(e) {
    let t = this.attributeNameForOutletName(e),
      r = new AttributeObserver(this.scope.element, t, this);
    this.attributeObserverMap.set(e, r), r.start();
  }
  selector(e) {
    return this.scope.outlets.getSelectorForOutletName(e);
  }
  attributeNameForOutletName(e) {
    return this.scope.schema.outletAttributeForScope(this.identifier, e);
  }
  getOutletNameFromOutletAttributeName(e) {
    return this.outletDefinitions.find(
      (t) => this.attributeNameForOutletName(t) === e
    );
  }
  get outletDependencies() {
    let e = new Multimap();
    return (
      this.router.modules.forEach((t) => {
        let r = t.definition.controllerConstructor,
          s = readInheritableStaticArrayValues(r, "outlets");
        s.forEach((r) => e.add(r, t.identifier));
      }),
      e
    );
  }
  get outletDefinitions() {
    return this.outletDependencies.getKeysForValue(this.identifier);
  }
  get dependentControllerIdentifiers() {
    return this.outletDependencies.getValuesForKey(this.identifier);
  }
  get dependentContexts() {
    let e = this.dependentControllerIdentifiers;
    return this.router.contexts.filter((t) => e.includes(t.identifier));
  }
  hasOutlet(e, t) {
    return !!this.getOutlet(e, t) || !!this.getOutletFromMap(e, t);
  }
  getOutlet(e, t) {
    return this.application.getControllerForElementAndIdentifier(e, t);
  }
  getOutletFromMap(e, t) {
    return this.outletsByName.getValuesForKey(t).find((t) => t.element === e);
  }
  get scope() {
    return this.context.scope;
  }
  get schema() {
    return this.context.schema;
  }
  get identifier() {
    return this.context.identifier;
  }
  get application() {
    return this.context.application;
  }
  get router() {
    return this.application.router;
  }
}
class Context {
  constructor(e, t) {
    (this.logDebugActivity = (e, t = {}) => {
      let { identifier: r, controller: s, element: i } = this;
      (t = Object.assign({ identifier: r, controller: s, element: i }, t)),
        this.application.logDebugActivity(this.identifier, e, t);
    }),
      (this.module = e),
      (this.scope = t),
      (this.controller = new e.controllerConstructor(this)),
      (this.bindingObserver = new BindingObserver(this, this.dispatcher)),
      (this.valueObserver = new ValueObserver(this, this.controller)),
      (this.targetObserver = new TargetObserver(this, this)),
      (this.outletObserver = new OutletObserver(this, this));
    try {
      this.controller.initialize(), this.logDebugActivity("initialize");
    } catch (r) {
      this.handleError(r, "initializing controller");
    }
  }
  connect() {
    this.bindingObserver.start(),
      this.valueObserver.start(),
      this.targetObserver.start(),
      this.outletObserver.start();
    try {
      this.controller.connect(), this.logDebugActivity("connect");
    } catch (e) {
      this.handleError(e, "connecting controller");
    }
  }
  refresh() {
    this.outletObserver.refresh();
  }
  disconnect() {
    try {
      this.controller.disconnect(), this.logDebugActivity("disconnect");
    } catch (e) {
      this.handleError(e, "disconnecting controller");
    }
    this.outletObserver.stop(),
      this.targetObserver.stop(),
      this.valueObserver.stop(),
      this.bindingObserver.stop();
  }
  get application() {
    return this.module.application;
  }
  get identifier() {
    return this.module.identifier;
  }
  get schema() {
    return this.application.schema;
  }
  get dispatcher() {
    return this.application.dispatcher;
  }
  get element() {
    return this.scope.element;
  }
  get parentElement() {
    return this.element.parentElement;
  }
  handleError(e, t, r = {}) {
    let { identifier: s, controller: i, element: n } = this;
    (r = Object.assign({ identifier: s, controller: i, element: n }, r)),
      this.application.handleError(e, `Error ${t}`, r);
  }
  targetConnected(e, t) {
    this.invokeControllerMethod(`${t}TargetConnected`, e);
  }
  targetDisconnected(e, t) {
    this.invokeControllerMethod(`${t}TargetDisconnected`, e);
  }
  outletConnected(e, t, r) {
    this.invokeControllerMethod(`${namespaceCamelize(r)}OutletConnected`, e, t);
  }
  outletDisconnected(e, t, r) {
    this.invokeControllerMethod(
      `${namespaceCamelize(r)}OutletDisconnected`,
      e,
      t
    );
  }
  invokeControllerMethod(e, ...t) {
    let r = this.controller;
    "function" == typeof r[e] && r[e](...t);
  }
}
function bless(e) {
  return shadow(e, getBlessedProperties(e));
}
function shadow(e, t) {
  let r = extend(e),
    s = getShadowProperties(e.prototype, t);
  return Object.defineProperties(r.prototype, s), r;
}
function getBlessedProperties(e) {
  let t = readInheritableStaticArrayValues(e, "blessings");
  return t.reduce((t, r) => {
    let s = r(e);
    for (let i in s) {
      let n = t[i] || {};
      t[i] = Object.assign(n, s[i]);
    }
    return t;
  }, {});
}
function getShadowProperties(e, t) {
  return getOwnKeys(t).reduce((r, s) => {
    let i = getShadowedDescriptor(e, t, s);
    return i && Object.assign(r, { [s]: i }), r;
  }, {});
}
function getShadowedDescriptor(e, t, r) {
  let s = Object.getOwnPropertyDescriptor(e, r);
  if (!(s && "value" in s)) {
    let i = Object.getOwnPropertyDescriptor(t, r).value;
    return s && ((i.get = s.get || i.get), (i.set = s.set || i.set)), i;
  }
}
let getOwnKeys =
    "function" == typeof Object.getOwnPropertySymbols
      ? (e) => [
          ...Object.getOwnPropertyNames(e),
          ...Object.getOwnPropertySymbols(e),
        ]
      : Object.getOwnPropertyNames,
  extend = (() => {
    function e(e) {
      function t() {
        return Reflect.construct(e, arguments, new.target);
      }
      return (
        (t.prototype = Object.create(e.prototype, {
          constructor: { value: t },
        })),
        Reflect.setPrototypeOf(t, e),
        t
      );
    }
    function t() {
      let t = function () {
          this.a.call(this);
        },
        r = e(t);
      return (r.prototype.a = function () {}), new r();
    }
    try {
      return t(), e;
    } catch (r) {
      return (e) => class t extends e {};
    }
  })();
function blessDefinition(e) {
  return {
    identifier: e.identifier,
    controllerConstructor: bless(e.controllerConstructor),
  };
}
class Module {
  constructor(e, t) {
    (this.application = e),
      (this.definition = blessDefinition(t)),
      (this.contextsByScope = new WeakMap()),
      (this.connectedContexts = new Set());
  }
  get identifier() {
    return this.definition.identifier;
  }
  get controllerConstructor() {
    return this.definition.controllerConstructor;
  }
  get contexts() {
    return Array.from(this.connectedContexts);
  }
  connectContextForScope(e) {
    let t = this.fetchContextForScope(e);
    this.connectedContexts.add(t), t.connect();
  }
  disconnectContextForScope(e) {
    let t = this.contextsByScope.get(e);
    t && (this.connectedContexts.delete(t), t.disconnect());
  }
  fetchContextForScope(e) {
    let t = this.contextsByScope.get(e);
    return t || ((t = new Context(this, e)), this.contextsByScope.set(e, t)), t;
  }
}
class ClassMap {
  constructor(e) {
    this.scope = e;
  }
  has(e) {
    return this.data.has(this.getDataKey(e));
  }
  get(e) {
    return this.getAll(e)[0];
  }
  getAll(e) {
    let t = this.data.get(this.getDataKey(e)) || "";
    return tokenize(t);
  }
  getAttributeName(e) {
    return this.data.getAttributeNameForKey(this.getDataKey(e));
  }
  getDataKey(e) {
    return `${e}-class`;
  }
  get data() {
    return this.scope.data;
  }
}
class DataMap {
  constructor(e) {
    this.scope = e;
  }
  get element() {
    return this.scope.element;
  }
  get identifier() {
    return this.scope.identifier;
  }
  get(e) {
    let t = this.getAttributeNameForKey(e);
    return this.element.getAttribute(t);
  }
  set(e, t) {
    let r = this.getAttributeNameForKey(e);
    return this.element.setAttribute(r, t), this.get(e);
  }
  has(e) {
    let t = this.getAttributeNameForKey(e);
    return this.element.hasAttribute(t);
  }
  delete(e) {
    if (!this.has(e)) return !1;
    {
      let t = this.getAttributeNameForKey(e);
      return this.element.removeAttribute(t), !0;
    }
  }
  getAttributeNameForKey(e) {
    return `data-${this.identifier}-${dasherize(e)}`;
  }
}
class Guide {
  constructor(e) {
    (this.warnedKeysByObject = new WeakMap()), (this.logger = e);
  }
  warn(e, t, r) {
    let s = this.warnedKeysByObject.get(e);
    s || ((s = new Set()), this.warnedKeysByObject.set(e, s)),
      s.has(t) || (s.add(t), this.logger.warn(r, e));
  }
}
function attributeValueContainsToken(e, t) {
  return `[${e}~="${t}"]`;
}
class TargetSet {
  constructor(e) {
    this.scope = e;
  }
  get element() {
    return this.scope.element;
  }
  get identifier() {
    return this.scope.identifier;
  }
  get schema() {
    return this.scope.schema;
  }
  has(e) {
    return null != this.find(e);
  }
  find(...e) {
    return e.reduce(
      (e, t) => e || this.findTarget(t) || this.findLegacyTarget(t),
      void 0
    );
  }
  findAll(...e) {
    return e.reduce(
      (e, t) => [
        ...e,
        ...this.findAllTargets(t),
        ...this.findAllLegacyTargets(t),
      ],
      []
    );
  }
  findTarget(e) {
    let t = this.getSelectorForTargetName(e);
    return this.scope.findElement(t);
  }
  findAllTargets(e) {
    let t = this.getSelectorForTargetName(e);
    return this.scope.findAllElements(t);
  }
  getSelectorForTargetName(e) {
    let t = this.schema.targetAttributeForScope(this.identifier);
    return attributeValueContainsToken(t, e);
  }
  findLegacyTarget(e) {
    let t = this.getLegacySelectorForTargetName(e);
    return this.deprecate(this.scope.findElement(t), e);
  }
  findAllLegacyTargets(e) {
    let t = this.getLegacySelectorForTargetName(e);
    return this.scope.findAllElements(t).map((t) => this.deprecate(t, e));
  }
  getLegacySelectorForTargetName(e) {
    let t = `${this.identifier}.${e}`;
    return attributeValueContainsToken(this.schema.targetAttribute, t);
  }
  deprecate(e, t) {
    if (e) {
      let { identifier: r } = this,
        s = this.schema.targetAttribute,
        i = this.schema.targetAttributeForScope(r);
      this.guide.warn(
        e,
        `target:${t}`,
        `Please replace ${s}="${r}.${t}" with ${i}="${t}". The ${s} attribute is deprecated and will be removed in a future version of Stimulus.`
      );
    }
    return e;
  }
  get guide() {
    return this.scope.guide;
  }
}
class OutletSet {
  constructor(e, t) {
    (this.scope = e), (this.controllerElement = t);
  }
  get element() {
    return this.scope.element;
  }
  get identifier() {
    return this.scope.identifier;
  }
  get schema() {
    return this.scope.schema;
  }
  has(e) {
    return null != this.find(e);
  }
  find(...e) {
    return e.reduce((e, t) => e || this.findOutlet(t), void 0);
  }
  findAll(...e) {
    return e.reduce((e, t) => [...e, ...this.findAllOutlets(t)], []);
  }
  getSelectorForOutletName(e) {
    let t = this.schema.outletAttributeForScope(this.identifier, e);
    return this.controllerElement.getAttribute(t);
  }
  findOutlet(e) {
    let t = this.getSelectorForOutletName(e);
    if (t) return this.findElement(t, e);
  }
  findAllOutlets(e) {
    let t = this.getSelectorForOutletName(e);
    return t ? this.findAllElements(t, e) : [];
  }
  findElement(e, t) {
    let r = this.scope.queryElements(e);
    return r.filter((r) => this.matchesElement(r, e, t))[0];
  }
  findAllElements(e, t) {
    let r = this.scope.queryElements(e);
    return r.filter((r) => this.matchesElement(r, e, t));
  }
  matchesElement(e, t, r) {
    let s = e.getAttribute(this.scope.schema.controllerAttribute) || "";
    return e.matches(t) && s.split(" ").includes(r);
  }
}
class Scope {
  constructor(e, t, r, s) {
    (this.targets = new TargetSet(this)),
      (this.classes = new ClassMap(this)),
      (this.data = new DataMap(this)),
      (this.containsElement = (e) =>
        e.closest(this.controllerSelector) === this.element),
      (this.schema = e),
      (this.element = t),
      (this.identifier = r),
      (this.guide = new Guide(s)),
      (this.outlets = new OutletSet(this.documentScope, t));
  }
  findElement(e) {
    return this.element.matches(e)
      ? this.element
      : this.queryElements(e).find(this.containsElement);
  }
  findAllElements(e) {
    return [
      ...(this.element.matches(e) ? [this.element] : []),
      ...this.queryElements(e).filter(this.containsElement),
    ];
  }
  queryElements(e) {
    return Array.from(this.element.querySelectorAll(e));
  }
  get controllerSelector() {
    return attributeValueContainsToken(
      this.schema.controllerAttribute,
      this.identifier
    );
  }
  get isDocumentScope() {
    return this.element === document.documentElement;
  }
  get documentScope() {
    return this.isDocumentScope
      ? this
      : new Scope(
          this.schema,
          document.documentElement,
          this.identifier,
          this.guide.logger
        );
  }
}
class ScopeObserver {
  constructor(e, t, r) {
    (this.element = e),
      (this.schema = t),
      (this.delegate = r),
      (this.valueListObserver = new ValueListObserver(
        this.element,
        this.controllerAttribute,
        this
      )),
      (this.scopesByIdentifierByElement = new WeakMap()),
      (this.scopeReferenceCounts = new WeakMap());
  }
  start() {
    this.valueListObserver.start();
  }
  stop() {
    this.valueListObserver.stop();
  }
  get controllerAttribute() {
    return this.schema.controllerAttribute;
  }
  parseValueForToken(e) {
    let { element: t, content: r } = e;
    return this.parseValueForElementAndIdentifier(t, r);
  }
  parseValueForElementAndIdentifier(e, t) {
    let r = this.fetchScopesByIdentifierForElement(e),
      s = r.get(t);
    return (
      s ||
        ((s = this.delegate.createScopeForElementAndIdentifier(e, t)),
        r.set(t, s)),
      s
    );
  }
  elementMatchedValue(e, t) {
    let r = (this.scopeReferenceCounts.get(t) || 0) + 1;
    this.scopeReferenceCounts.set(t, r),
      1 == r && this.delegate.scopeConnected(t);
  }
  elementUnmatchedValue(e, t) {
    let r = this.scopeReferenceCounts.get(t);
    r &&
      (this.scopeReferenceCounts.set(t, r - 1),
      1 == r && this.delegate.scopeDisconnected(t));
  }
  fetchScopesByIdentifierForElement(e) {
    let t = this.scopesByIdentifierByElement.get(e);
    return (
      t || ((t = new Map()), this.scopesByIdentifierByElement.set(e, t)), t
    );
  }
}
class Router {
  constructor(e) {
    (this.application = e),
      (this.scopeObserver = new ScopeObserver(this.element, this.schema, this)),
      (this.scopesByIdentifier = new Multimap()),
      (this.modulesByIdentifier = new Map());
  }
  get element() {
    return this.application.element;
  }
  get schema() {
    return this.application.schema;
  }
  get logger() {
    return this.application.logger;
  }
  get controllerAttribute() {
    return this.schema.controllerAttribute;
  }
  get modules() {
    return Array.from(this.modulesByIdentifier.values());
  }
  get contexts() {
    return this.modules.reduce((e, t) => e.concat(t.contexts), []);
  }
  start() {
    this.scopeObserver.start();
  }
  stop() {
    this.scopeObserver.stop();
  }
  loadDefinition(e) {
    this.unloadIdentifier(e.identifier);
    let t = new Module(this.application, e);
    this.connectModule(t);
    let r = e.controllerConstructor.afterLoad;
    r && r.call(e.controllerConstructor, e.identifier, this.application);
  }
  unloadIdentifier(e) {
    let t = this.modulesByIdentifier.get(e);
    t && this.disconnectModule(t);
  }
  getContextForElementAndIdentifier(e, t) {
    let r = this.modulesByIdentifier.get(t);
    if (r) return r.contexts.find((t) => t.element == e);
  }
  proposeToConnectScopeForElementAndIdentifier(e, t) {
    let r = this.scopeObserver.parseValueForElementAndIdentifier(e, t);
    r
      ? this.scopeObserver.elementMatchedValue(r.element, r)
      : console.error(
          `Couldn't find or create scope for identifier: "${t}" and element:`,
          e
        );
  }
  handleError(e, t, r) {
    this.application.handleError(e, t, r);
  }
  createScopeForElementAndIdentifier(e, t) {
    return new Scope(this.schema, e, t, this.logger);
  }
  scopeConnected(e) {
    this.scopesByIdentifier.add(e.identifier, e);
    let t = this.modulesByIdentifier.get(e.identifier);
    t && t.connectContextForScope(e);
  }
  scopeDisconnected(e) {
    this.scopesByIdentifier.delete(e.identifier, e);
    let t = this.modulesByIdentifier.get(e.identifier);
    t && t.disconnectContextForScope(e);
  }
  connectModule(e) {
    this.modulesByIdentifier.set(e.identifier, e);
    let t = this.scopesByIdentifier.getValuesForKey(e.identifier);
    t.forEach((t) => e.connectContextForScope(t));
  }
  disconnectModule(e) {
    this.modulesByIdentifier.delete(e.identifier);
    let t = this.scopesByIdentifier.getValuesForKey(e.identifier);
    t.forEach((t) => e.disconnectContextForScope(t));
  }
}
let defaultSchema = {
  controllerAttribute: "data-controller",
  actionAttribute: "data-action",
  targetAttribute: "data-target",
  targetAttributeForScope: (e) => `data-${e}-target`,
  outletAttributeForScope: (e, t) => `data-${e}-${t}-outlet`,
  keyMappings: Object.assign(
    Object.assign(
      {
        enter: "Enter",
        tab: "Tab",
        esc: "Escape",
        space: " ",
        up: "ArrowUp",
        down: "ArrowDown",
        left: "ArrowLeft",
        right: "ArrowRight",
        home: "Home",
        end: "End",
        page_up: "PageUp",
        page_down: "PageDown",
      },
      objectFromEntries(
        "abcdefghijklmnopqrstuvwxyz".split("").map((e) => [e, e])
      )
    ),
    objectFromEntries("0123456789".split("").map((e) => [e, e]))
  ),
};
function objectFromEntries(e) {
  return e.reduce(
    (e, [t, r]) => Object.assign(Object.assign({}, e), { [t]: r }),
    {}
  );
}
class Application {
  constructor(e = document.documentElement, t = defaultSchema) {
    (this.logger = console),
      (this.debug = !1),
      (this.logDebugActivity = (e, t, r = {}) => {
        this.debug && this.logFormattedMessage(e, t, r);
      }),
      (this.element = e),
      (this.schema = t),
      (this.dispatcher = new Dispatcher(this)),
      (this.router = new Router(this)),
      (this.actionDescriptorFilters = Object.assign(
        {},
        defaultActionDescriptorFilters
      ));
  }
  static start(e, t) {
    let r = new this(e, t);
    return r.start(), r;
  }
  async start() {
    await domReady(),
      this.logDebugActivity("application", "starting"),
      this.dispatcher.start(),
      this.router.start(),
      this.logDebugActivity("application", "start");
  }
  stop() {
    this.logDebugActivity("application", "stopping"),
      this.dispatcher.stop(),
      this.router.stop(),
      this.logDebugActivity("application", "stop");
  }
  register(e, t) {
    this.load({ identifier: e, controllerConstructor: t });
  }
  registerActionOption(e, t) {
    this.actionDescriptorFilters[e] = t;
  }
  load(e, ...t) {
    let r = Array.isArray(e) ? e : [e, ...t];
    r.forEach((e) => {
      e.controllerConstructor.shouldLoad && this.router.loadDefinition(e);
    });
  }
  unload(e, ...t) {
    let r = Array.isArray(e) ? e : [e, ...t];
    r.forEach((e) => this.router.unloadIdentifier(e));
  }
  get controllers() {
    return this.router.contexts.map((e) => e.controller);
  }
  getControllerForElementAndIdentifier(e, t) {
    let r = this.router.getContextForElementAndIdentifier(e, t);
    return r ? r.controller : null;
  }
  handleError(e, t, r) {
    var s;
    this.logger.error(
      `%s

%o

%o`,
      t,
      e,
      r
    ),
      null === (s = window.onerror) ||
        void 0 === s ||
        s.call(window, t, "", 0, 0, e);
  }
  logFormattedMessage(e, t, r = {}) {
    (r = Object.assign({ application: this }, r)),
      this.logger.groupCollapsed(`${e} #${t}`),
      this.logger.log("details:", Object.assign({}, r)),
      this.logger.groupEnd();
  }
}
function domReady() {
  return new Promise((e) => {
    "loading" == document.readyState
      ? document.addEventListener("DOMContentLoaded", () => e())
      : e();
  });
}
function ClassPropertiesBlessing(e) {
  let t = readInheritableStaticArrayValues(e, "classes");
  return t.reduce(
    (e, t) => Object.assign(e, propertiesForClassDefinition(t)),
    {}
  );
}
function propertiesForClassDefinition(e) {
  return {
    [`${e}Class`]: {
      get() {
        let { classes: t } = this;
        if (t.has(e)) return t.get(e);
        {
          let r = t.getAttributeName(e);
          throw Error(`Missing attribute "${r}"`);
        }
      },
    },
    [`${e}Classes`]: {
      get() {
        return this.classes.getAll(e);
      },
    },
    [`has${capitalize(e)}Class`]: {
      get() {
        return this.classes.has(e);
      },
    },
  };
}
function OutletPropertiesBlessing(e) {
  let t = readInheritableStaticArrayValues(e, "outlets");
  return t.reduce(
    (e, t) => Object.assign(e, propertiesForOutletDefinition(t)),
    {}
  );
}
function getOutletController(e, t, r) {
  return e.application.getControllerForElementAndIdentifier(t, r);
}
function getControllerAndEnsureConnectedScope(e, t, r) {
  let s = getOutletController(e, t, r);
  return (
    s ||
    ((e.application.router.proposeToConnectScopeForElementAndIdentifier(t, r),
    (s = getOutletController(e, t, r)))
      ? s
      : void 0)
  );
}
function propertiesForOutletDefinition(e) {
  let t = namespaceCamelize(e);
  return {
    [`${t}Outlet`]: {
      get() {
        let t = this.outlets.find(e),
          r = this.outlets.getSelectorForOutletName(e);
        if (t) {
          let s = getControllerAndEnsureConnectedScope(this, t, e);
          if (s) return s;
          throw Error(
            `The provided outlet element is missing an outlet controller "${e}" instance for host controller "${this.identifier}"`
          );
        }
        throw Error(
          `Missing outlet element "${e}" for host controller "${this.identifier}". Stimulus couldn't find a matching outlet element using selector "${r}".`
        );
      },
    },
    [`${t}Outlets`]: {
      get() {
        let t = this.outlets.findAll(e);
        return t.length > 0
          ? t
              .map((t) => {
                let r = getControllerAndEnsureConnectedScope(this, t, e);
                if (r) return r;
                console.warn(
                  `The provided outlet element is missing an outlet controller "${e}" instance for host controller "${this.identifier}"`,
                  t
                );
              })
              .filter((e) => e)
          : [];
      },
    },
    [`${t}OutletElement`]: {
      get() {
        let t = this.outlets.find(e),
          r = this.outlets.getSelectorForOutletName(e);
        if (t) return t;
        throw Error(
          `Missing outlet element "${e}" for host controller "${this.identifier}". Stimulus couldn't find a matching outlet element using selector "${r}".`
        );
      },
    },
    [`${t}OutletElements`]: {
      get() {
        return this.outlets.findAll(e);
      },
    },
    [`has${capitalize(t)}Outlet`]: {
      get() {
        return this.outlets.has(e);
      },
    },
  };
}
function TargetPropertiesBlessing(e) {
  let t = readInheritableStaticArrayValues(e, "targets");
  return t.reduce(
    (e, t) => Object.assign(e, propertiesForTargetDefinition(t)),
    {}
  );
}
function propertiesForTargetDefinition(e) {
  return {
    [`${e}Target`]: {
      get() {
        let t = this.targets.find(e);
        if (t) return t;
        throw Error(
          `Missing target element "${e}" for "${this.identifier}" controller`
        );
      },
    },
    [`${e}Targets`]: {
      get() {
        return this.targets.findAll(e);
      },
    },
    [`has${capitalize(e)}Target`]: {
      get() {
        return this.targets.has(e);
      },
    },
  };
}
function ValuePropertiesBlessing(e) {
  let t = readInheritableStaticObjectPairs(e, "values");
  return t.reduce(
    (e, t) => Object.assign(e, propertiesForValueDefinitionPair(t)),
    {
      valueDescriptorMap: {
        get() {
          return t.reduce((e, t) => {
            let r = parseValueDefinitionPair(t, this.identifier),
              s = this.data.getAttributeNameForKey(r.key);
            return Object.assign(e, { [s]: r });
          }, {});
        },
      },
    }
  );
}
function propertiesForValueDefinitionPair(e, t) {
  let r = parseValueDefinitionPair(e, t),
    { key: s, name: i, reader: n, writer: o } = r;
  return {
    [i]: {
      get() {
        let e = this.data.get(s);
        return null !== e ? n(e) : r.defaultValue;
      },
      set(e) {
        void 0 === e ? this.data.delete(s) : this.data.set(s, o(e));
      },
    },
    [`has${capitalize(i)}`]: {
      get() {
        return this.data.has(s) || r.hasCustomDefaultValue;
      },
    },
  };
}
function parseValueDefinitionPair([e, t], r) {
  return valueDescriptorForTokenAndTypeDefinition({
    controller: r,
    token: e,
    typeDefinition: t,
  });
}
function parseValueTypeConstant(e) {
  switch (e) {
    case Array:
      return "array";
    case Boolean:
      return "boolean";
    case Number:
      return "number";
    case Object:
      return "object";
    case String:
      return "string";
  }
}
function parseValueTypeDefault(e) {
  switch (typeof e) {
    case "boolean":
      return "boolean";
    case "number":
      return "number";
    case "string":
      return "string";
  }
  return Array.isArray(e)
    ? "array"
    : "[object Object]" === Object.prototype.toString.call(e)
    ? "object"
    : void 0;
}
function parseValueTypeObject(e) {
  let { controller: t, token: r, typeObject: s } = e,
    i = isSomething(s.type),
    n = isSomething(s.default),
    o = parseValueTypeConstant(s.type),
    a = parseValueTypeDefault(e.typeObject.default);
  if (i && !n) return o;
  if (!i && n) return a;
  if (o !== a) {
    let l = t ? `${t}.${r}` : r;
    throw Error(
      `The specified default value for the Stimulus Value "${l}" must match the defined type "${o}". The provided default value of "${s.default}" is of type "${a}".`
    );
  }
  if (i && n) return o;
}
function parseValueTypeDefinition(e) {
  let { controller: t, token: r, typeDefinition: s } = e,
    i = parseValueTypeObject({ controller: t, token: r, typeObject: s }),
    n = parseValueTypeDefault(s),
    o = parseValueTypeConstant(s),
    a = i || n || o;
  if (a) return a;
  let l = t ? `${t}.${s}` : r;
  throw Error(`Unknown value type "${l}" for "${r}" value`);
}
function defaultValueForDefinition(e) {
  let t = parseValueTypeConstant(e);
  if (t) return defaultValuesByType[t];
  let r = hasProperty(e, "default"),
    s = hasProperty(e, "type"),
    i = e;
  if (r) return i.default;
  if (s) {
    let { type: n } = i,
      o = parseValueTypeConstant(n);
    if (o) return defaultValuesByType[o];
  }
  return e;
}
function valueDescriptorForTokenAndTypeDefinition(e) {
  let { token: t, typeDefinition: r } = e,
    s = `${dasherize(t)}-value`,
    i = parseValueTypeDefinition(e);
  return {
    type: i,
    key: s,
    name: camelize(s),
    get defaultValue() {
      return defaultValueForDefinition(r);
    },
    get hasCustomDefaultValue() {
      return void 0 !== parseValueTypeDefault(r);
    },
    reader: readers[i],
    writer: writers[i] || writers.default,
  };
}
let defaultValuesByType = {
    get array() {
      return [];
    },
    boolean: !1,
    number: 0,
    get object() {
      return {};
    },
    string: "",
  },
  readers = {
    array(e) {
      let t = JSON.parse(e);
      if (!Array.isArray(t))
        throw TypeError(
          `expected value of type "array" but instead got value "${e}" of type "${parseValueTypeDefault(
            t
          )}"`
        );
      return t;
    },
    boolean: (e) => !("0" == e || "false" == String(e).toLowerCase()),
    number: (e) => Number(e.replace(/_/g, "")),
    object(e) {
      let t = JSON.parse(e);
      if (null === t || "object" != typeof t || Array.isArray(t))
        throw TypeError(
          `expected value of type "object" but instead got value "${e}" of type "${parseValueTypeDefault(
            t
          )}"`
        );
      return t;
    },
    string: (e) => e,
  },
  writers = { default: writeString, array: writeJSON, object: writeJSON };
function writeJSON(e) {
  return JSON.stringify(e);
}
function writeString(e) {
  return `${e}`;
}
class Controller {
  constructor(e) {
    this.context = e;
  }
  static get shouldLoad() {
    return !0;
  }
  static afterLoad(e, t) {}
  get application() {
    return this.context.application;
  }
  get scope() {
    return this.context.scope;
  }
  get element() {
    return this.scope.element;
  }
  get identifier() {
    return this.scope.identifier;
  }
  get targets() {
    return this.scope.targets;
  }
  get outlets() {
    return this.scope.outlets;
  }
  get classes() {
    return this.scope.classes;
  }
  get data() {
    return this.scope.data;
  }
  initialize() {}
  connect() {}
  disconnect() {}
  dispatch(
    e,
    {
      target: t = this.element,
      detail: r = {},
      prefix: s = this.identifier,
      bubbles: i = !0,
      cancelable: n = !0,
    } = {}
  ) {
    let o = s ? `${s}:${e}` : e,
      a = new CustomEvent(o, { detail: r, bubbles: i, cancelable: n });
    return t.dispatchEvent(a), a;
  }
}
(Controller.blessings = [
  ClassPropertiesBlessing,
  TargetPropertiesBlessing,
  ValuePropertiesBlessing,
  OutletPropertiesBlessing,
]),
  (Controller.targets = []),
  (Controller.outlets = []),
  (Controller.values = {});
export {
  Application,
  AttributeObserver,
  Context,
  Controller,
  ElementObserver,
  IndexedMultimap,
  Multimap,
  SelectorObserver,
  StringMapObserver,
  TokenListObserver,
  ValueListObserver,
  add,
  defaultSchema,
  del,
  fetch,
  prune,
};
