import isArray from 'lodash/lang/isArray';
import isPlainObject from 'lodash/lang/isPlainObject';
import startsWith from 'lodash/string/startsWith';
import find from 'lodash/collection/find';
import reject from 'lodash/collection/reject';
import trim from 'lodash/string/trim';
import get from 'lodash/object/get';

const VARIABLE_START = '$';

export default class Translation {
  constructor(name, value , options = {}, root = this) {
    const isDefault = name && startsWith(name, '_');

    this._name = isDefault ? name.substr(1) : name;
    this._value = value;
    this._options = options;
    this._root = root;

    this._isDefault = isDefault;
    this._children = [];

    if (isPlainObject(value)) {
      Object.keys(value).forEach((key) => {
        this.set(key, value[key], options);
      });
    }
  }

  toString() {
    return this.get();
  }

  _processAttrs(value, attrs = {}) {
    if (!value) {
      return value;
    }

    const root = this._root;

    return value.replace(/{([\s\S]+?)}/g, (m, key) => {
      const name = trim(key);
      if (!name) {
        return void 0;
      }

      // TODO check variable
      const isVariable = startsWith(name, VARIABLE_START);
      if (!isVariable) {
        return root.get(name, attrs);
      }

      const variable = name.substr(VARIABLE_START.length);
      return get(attrs, variable);
    });
  }

  get(path, attrs = {}) {
    if (isPlainObject(path)) {
      return this.get(null, path);
    }

    if (path) {
      const pos = path.indexOf('.');
      if (pos !== -1) {
        const name = path.substr(0, pos);
        const newPath = path.substr(pos + 1);

        const translation = this[name];
        if (!translation) {
          return void 0;
        }

        return translation.get(newPath, attrs);
      }

      return this[path].get(null, attrs);
    }

    const value = this._value;

    if (isArray(value)) {
      // TODO fix it
      return this._getValueFromArray(value, attrs);
    }

    if (isPlainObject(value)) {
      // search default value
      const defaultChild = find(this._children, (child) => child._isDefault);
      return defaultChild ? defaultChild.get(attrs) : void 0;
    }

    return this._processAttrs(value, attrs);
  }

  set(name, value) {
    if (isPlainObject(name)) {
      Object.keys(name).forEach((key) => {
        this.set(key, name[key]);
      });
      return this;
    }

    const translation = new Translation(name, value, this._options, this._root);
    const key = translation._name;

    // remove old translation
    const currentTranslation = this[key];
    if (currentTranslation) {
      this._children = reject(this._children, (child) => child === currentTranslation);
    }

    // save new translation
    this._children.push(translation);
    this[key] = translation;

    return this;
  }
}
