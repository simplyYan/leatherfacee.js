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
        // Adicione mais diretivas conforme necessário
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
