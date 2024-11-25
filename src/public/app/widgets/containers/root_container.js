import FlexContainer from "./flex_container.js";

export default class RootContainer extends FlexContainer {
    constructor(isHorizontalLayout) {
        super(isHorizontalLayout ? "column" : "row");

        this.id('root-widget');
        this.css('height', '100%');
    }
}
