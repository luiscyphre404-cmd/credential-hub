import { Provider } from '../provider.js';

export class DeclarativeCustomProvider extends Provider {
  constructor({ name }) {
    super();
    this.name = name;
    Object.freeze(this);
  }
}
