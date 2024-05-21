class ConcurrentMode {
    constructor() {
        this.queue = [];
        this.isProcessing = false;
    }

    enqueue(component) {
        this.queue.push(component);
        this.processQueue();
    }

    processQueue() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        const processNext = () => {
            if (this.queue.length === 0) {
                this.isProcessing = false;
                return;
            }

            const component = this.queue.shift();
            component.render();
            requestAnimationFrame(processNext);
        };

        processNext();
    }
}

class LefaceStore {
    constructor() {
        this.state = {};
        this.subscribers = [];
    }

    subscribe(callback) {
        this.subscribers.push(callback);
    }

    notify() {
        this.subscribers.forEach(callback => callback(this.state));
    }

    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.notify();
    }

    getState() {
        return this.state;
    }
}

class ChainsawAnim {
    constructor(t) {
        (this.el = "string" == typeof t ? document.querySelector(t) : t), (this.transforms = []), (this.durationVal = "2s");
    }
    transform(t) {
        return this.transforms.push(t), this;
    }
    translate(t, e = 0) {
        return this.transform(`translate(${t}px, ${e}px)`);
    }
    rotate(t) {
        return this.transform(`rotate(${t}deg)`);
    }
    scale(t, e = t) {
        return this.transform(`scale(${t}, ${e})`);
    }
    set(t, e) {
        return (this.el.style[t] = e), this;
    }
    duration(t) {
        return (this.durationVal = "string" == typeof t ? t : `${t}ms`), this;
    }
    end(t) {
        return (this.el.style.transitionDuration = this.durationVal), this.transforms.length && (this.el.style.transform = this.transforms.join(" ")), t && setTimeout(t, 1e3 * parseFloat(this.durationVal)), this;
    }
    Timeout(t) {
        if (!t || !t.Order || !t.Interval) return void console.error("Invalid parameters. Please provide an object with 'Order' and 'Interval' properties.");
        const e = t.Order.split(",").map((t) => t.trim()),
            r = t.Interval;
        e.forEach((t, e) => {
            setTimeout(() => {
                "function" == typeof window[t] ? window[t]() : console.error(`Function ${t} is not defined.`);
            }, e * r);
        });
    }
    ATimeout(t) {
        if (!t || !t.Order || !t.Interval) return void console.error("Invalid parameters. Please provide an object with 'Order' and 'Interval' properties.");
        const e = t.Order.split(",").map((t) => t.trim()),
            r = Array.isArray(t.Interval) ? t.Interval : [t.Interval];
        e.length === r.length
            ? e.forEach((t, e) => {
                  setTimeout(() => {
                      "function" == typeof window[t] ? window[t]() : console.error(`Function ${t} is not defined.`);
                  }, r[e]);
              })
            : console.error("The number of functions does not match the number of intervals provided.");
    }
}

class LefaceRender {
    constructor(options) {
        this.data = options.data;
        this.methods = options.methods;
        this.target = options.target;
        this.template = options.template;

        this.observe(this.data);
        this.compileTemplate();
        this.render();
    }

    observe(data) {
        Object.keys(data).forEach(key => {
            let value = data[key];
            const self = this;
            Object.defineProperty(data, key, {
                get() {
                    return value;
                },
                set(newValue) {
                    value = newValue;
                    self.render();
                }
            });
        });
    }

    compileTemplate() {
        this.compiledTemplate = this.template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return this.data[key] !== undefined ? this.data[key] : match;
        });
    }

    render() {
        if (this.target) {
            this.target.innerHTML = this.compiledTemplate;
        }
        this.bindDirectives();
    }

    bindDirectives() {
        const directives = this.target.querySelectorAll("[l-directive]");
        directives.forEach(directive => {
            const directiveName = directive.getAttribute("l-directive");
            const directiveValue = directive.getAttribute(`l-${directiveName}`);
            this.directives[directiveName](directive, directiveValue);
        });
    }

    directives = {
        text(element, value) {
            element.textContent = this.data[value];
        },
        model(element, value) {
            element.value = this.data[value];
            element.addEventListener("input", () => {
                this.data[value] = element.value;
            });
        }

    };
}
class LefaceComponent {
    constructor(props, leface) {
        this.props = props;
        this.element = null;
        this.leface = leface;
        this.render();
    }

    render() {
        throw new Error('Method "render" must be implemented.');
    }
}

class LefaceComputedComponent extends LefaceComponent {
    constructor(props, computedProps, leface) {
        super(props, leface);
        this.computedProps = computedProps;
    }

    getComputedProps() {
        return Object.keys(this.computedProps).reduce((acc, key) => {
            acc[key] = this.computedProps[key].call(this);
            return acc;
        }, {});
    }

    render() {
        const computedProps = this.getComputedProps();
        const allProps = { ...this.props, ...computedProps };
        this.element = this.renderComponent(allProps);
    }

    renderComponent(props) {
        throw new Error('Method "renderComponent" must be implemented.');
    }
}

class LefaceConcurrentComponent extends LefaceComputedComponent {
    constructor(props, computedProps, leface) {
        super(props, computedProps, leface);
    }

    render() {
        this.leface.concurrentMode.enqueue(this);
    }
}

class Leface {
    constructor() {
        this.components = {};
        this.concurrentMode = new ConcurrentMode();
        this.staticSiteGenerator = new StaticSiteGenerator(this);
        this.store = new LefaceStore();
    }

    register(name, component) {
        if (!this.components[name]) {
            this.components[name] = component;
        } else {
            console.error(`Component with name ${name} already exists.`);
        }
    }

    create(name, props) {
        const component = this.components[name];
        if (component) {
            return new component(props, this);
        } else {
            console.error(`Component with name ${name} does not exist.`);
            return null;
        }
    }

    generateStaticSite() {
        this.staticSiteGenerator.generate();
    }
}

class StaticSiteGenerator {
    constructor(leface) {
        this.leface = leface;
    }

    generate() {
        const zip = new JSZip();

        for (const componentName in this.leface.components) {
            const component = this.leface.components[componentName];
            const instance = new component({}, this.leface);
            const html = instance.element.outerHTML;
            zip.file(`${componentName}.html`, html);
        }

        zip.generateAsync({ type: "blob" }).then(blob => {
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = "static_site.zip";
            link.click();
        });
    }
}

class LefaceDirectives {
    constructor() {
        this.directives = {};
    }

    register(name, hook) {
        this.directives[name] = hook;
    }

    apply(element, props) {
        Object.keys(props).forEach(prop => {
            if (this.directives[prop]) {
                this.directives[prop](element, props[prop]);
            }
        });
    }
}

class LefaceRouter {
    constructor() {
        this.routes = {};
        this.currentRoute = "";
    }

    registerRoute(path, component) {
        this.routes[path] = component;
    }

    navigateTo(path) {
        const component = this.routes[path];
        if (component) {
            this.currentRoute = path;
            const instance = new component({});
            instance._lefaceComponentName = this.currentRoute;
            instance.render();
        } else {
            console.error(`Route ${path} does not exist.`);
        }
    }
}

class LefaceObserver {
    constructor() {
        this.observers = new Map();
    }

    observe(instance) {
        const props = instance.props;
        Object.keys(props).forEach(prop => {
            if (!this.observers.has(props[prop])) {
                this.observers.set(props[prop], new Set());
            }
            this.observers.get(props[prop]).add(instance);
        });
    }

    setProp(obj, prop, value) {
        obj[prop] = value;
        if (this.observers.has(value)) {
            this.observers.get(value).forEach(instance => {
                instance.render();
            });
        }
    }
}

class LefaceService {
    constructor() {
        this.services = {};
    }

    register(name, service) {
        if (!this.services[name]) {
            this.services[name] = service;
        } else {
            console.error(`Service with name ${name} already exists.`);
        }
    }

    get(name) {
        const service = this.services[name];
        if (service) {
            return service;
        } else {
            console.error(`Service with name ${name} does not exist.`);
            return null;
        }
    }
}

class LefaceFactory {
    constructor() {
        this.factories = {};
    }

    register(name, factory) {
        if (!this.factories[name]) {
            this.factories[name] = factory;
        } else {
            console.error(`Factory with name ${name} already exists.`);
        }
    }

    create(name, ...args) {
        const factory = this.factories[name];
        if (factory) {
            return factory(...args);
        } else {
            console.error(`Factory with name ${name} does not exist.`);
            return null;
        }
    }
}

function LefaceCrossPlatform(t) {
        const e = navigator.userAgent.toLowerCase();
        let r = "Desktop";
        /iphone|ipad|android|windows phone/.test(e) ? (r = "Mobile") : t.Tablet && window.innerWidth >= 768 && window.innerWidth <= 1024 && (r = "Tablet");
        const n = t[r];
        if (n) {
            const t = document.createElement("link");
            (t.rel = "stylesheet"), (t.href = n), document.head.appendChild(t);
        } else console.error("No CSS defined for the current platform.");
    }

class LefaceUtils {
    static loadExternalCSS(url) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = url;
        document.head.appendChild(link);
    }

    static loadExternalJS(url) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    static insertHTML(selector, html) {
        const element = document.querySelector(selector);
        if (element) {
            element.innerHTML = html;
        }
    }

    static setElementAttribute(selector, attribute, value) {
        const element = document.querySelector(selector);
        if (element) {
            element.setAttribute(attribute, value);
        }
    }

    static toggleVisibility(selector) {
        const element = document.querySelector(selector);
        if (element) {
            if (element.style.display === 'none') {
                element.style.display = '';
            } else {
                element.style.display = 'none';
            }
        }
    }

    static sanitizeHTML(html) {
        const template = document.createElement('template');
        template.innerHTML = html;

        const content = template.content;

        const elements = content.querySelectorAll('script, link[rel="import"], object, embed, iframe');
        elements.forEach(el => el.remove());

        const attributes = ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'];
        const allElements = content.querySelectorAll('*');
        allElements.forEach(el => {
            attributes.forEach(attr => {
                if (el.hasAttribute(attr)) {
                    el.removeAttribute(attr);
                }
            });
        });

        return content.innerHTML;
    }
}

class LefaceValidator {
    constructor(form) {
        this.form = form;
        this.errors = {};
    }

    addValidation(field, rules) {
        if (!this.errors[field]) {
            this.errors[field] = [];
        }
        rules.forEach(rule => {
            this.errors[field].push(rule);
        });
    }

    validate() {
        let isValid = true;
        this.clearErrors();
        for (let field in this.errors) {
            const fieldElement = this.form.querySelector(`[name="${field}"]`);
            if (!fieldElement) continue;
            const value = fieldElement.value;
            this.errors[field].forEach(rule => {
                const errorMessage = rule(value, fieldElement);
                if (errorMessage) {
                    this.addError(field, errorMessage);
                    isValid = false;
                }
            });
        }
        return isValid;
    }

    addError(field, message) {
        const errorContainer = this.form.querySelector(`.error-${field}`);
        if (errorContainer) {
            errorContainer.textContent = message;
        } else {
            const fieldElement = this.form.querySelector(`[name="${field}"]`);
            if (fieldElement) {
                const errorMessageElement = document.createElement('div');
                errorMessageElement.className = `error error-${field}`;
                errorMessageElement.textContent = message;
                fieldElement.parentNode.appendChild(errorMessageElement);
            }
        }
    }

    clearErrors() {
        const errorElements = this.form.querySelectorAll('.error');
        errorElements.forEach(element => element.remove());
    }
}

var LefaceRequests = {

    get: function(url, callback) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4 && xhr.status == 200) {
                callback(xhr.responseText);
            }
        };
        xhr.send();
    },

    post: function(url, data, callback) {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', url, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4 && xhr.status == 200) {
                callback(xhr.responseText);
            }
        };
        xhr.send(JSON.stringify(data));
    }
};

function LeatherlangChecker() {
    "use strict"
  
    var codeElements = document.getElementsByTagName("code")
    var i = codeElements.length
    var delimiter = "when click on"
    var codeBlock
    var codeBlockContent
  
    while (i--) {
      var code = codeElements[i]
      var content = code.textContent.trim()
  
      if (content.lastIndexOf(delimiter, 0) === 0) {
        codeBlock = code
        codeBlockContent = content
        break
      }
    }
  
    if (!codeBlock) return
    codeBlock.parentNode.removeChild(codeBlock)
  
    function InstructionParsing(instruction) {
      var separator = instruction.charAt(0)
      var instructionSplit = instruction.split(separator)
  
      this.clickSelector = instructionSplit[1]
      this.classBehavior = instructionSplit[2].trim().split(" ")[0]
      this.classValue = instructionSplit[3]
      this.targetSelector = instructionSplit[5]
    }
  
    function UIElement(clickSelector, classBehavior, classValue, targetSelector) {
      this.clickSelector = clickSelector
      this.classBehavior = classBehavior.charAt(classBehavior.length-1) == "s"
                         ? classBehavior.substring(0, classBehavior.length-1)
                         : classBehavior
      this.classValue = classValue.charAt(0) == "."
                      ? classValue.substring(1, classValue.length)
                      : classValue
      this.targetSelector = targetSelector
      this.createEventListener()
    }
  
    UIElement.prototype.createEventListener = function() {
      var self = this
      var clicked = document.querySelectorAll(self.clickSelector)
      var i = clicked.length
  
      if (i < 1) {
        throw new Error("There's no element matching your \"" + self.clickSelector + "\" CSS selector.")
      }
  
      while (i--) {
        clicked.item(i).addEventListener("click", clickCallback)
      }
  
      function updateClass(el) {
        el.classList[self.classBehavior](self.classValue)
      }
  
      function clickCallback(e) {
        switch (self.targetSelector) {
          case "target" :
          case "this"   :
          case "it"     :
          case "itself" :
          case undefined:
            updateClass(e.target)
            break
          default:
            var target = document.querySelectorAll(self.targetSelector)
            var i = target.length
            while (i--) {
              updateClass(target.item(i))
            }
        }
        if (e.target.nodeName.toLowerCase() == "a") {
          e.preventDefault()
        }
      }
    }
  
    codeBlockContent.split(delimiter).forEach(function(data) {
      if (!data) return
      var params = new InstructionParsing(data.trim())
      new UIElement(
        params.clickSelector,
        params.classBehavior,
        params.classValue,
        params.targetSelector
      )
    })
}

class Leatherlang {
    constructor() {
    }
  
    Code(content) {
      const codeElement = document.createElement('code');
      
      codeElement.textContent = content;
      codeElement.style.visibility = 'hidden';
      
      document.body.appendChild(codeElement);
      LeatherlangChecker()
    }
  }

class LefaceSignal {
    constructor() {
        this.listeners = {};
    }

    send(signal) {
        if (this.listeners[signal]) {
            this.listeners[signal].forEach(listener => {
                listener();
            });
        }
    }

    catch(signal, callback) {
        if (!this.listeners[signal]) {
            this.listeners[signal] = [];
        }
        this.listeners[signal].push(callback);
    }
}
