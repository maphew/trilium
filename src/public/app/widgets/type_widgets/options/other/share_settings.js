import OptionsWidget from "../options_widget.js";
import { t } from "../../../../services/i18n.js";

const TPL = `
<div class="options-section">
    <h4>${t('share.settings_title')}</h4>
    
    <div class="form-group">
        <label>${t('share.redirect_url_label')}</label>
        <input type="text" 
               class="share-redirect-url form-control" 
               name="shareRedirectUrl"
               placeholder="share"/>
        <small class="form-text text-muted">${t('share.redirect_url_description')}</small>
    </div>

    <div class="form-group">
        <label>${t('share.login_redirect_url_label')}</label>
        <input type="text" 
               class="login-redirect-url form-control" 
               name="loginRedirectUrl"
               placeholder="login"/>
        <small class="form-text text-muted">${t('share.login_redirect_url_description')}</small>
    </div>

    <div class="form-group">
        <label class="form-check">
            <input type="checkbox" 
                   class="show-login-in-share form-check-input" 
                   name="showLoginInShareTheme"/>
            ${t('share.show_login_label')}
        </label>
        <small class="form-text text-muted">${t('share.show_login_description')}</small>
    </div>
</div>
`;

export default class ShareSettingsWidget extends OptionsWidget {
    doRender() {
        this.$widget = $(TPL);

        this.$shareRedirectUrl = this.$widget.find(".share-redirect-url");
        this.$loginRedirectUrl = this.$widget.find(".login-redirect-url");
        this.$showLoginInShare = this.$widget.find(".show-login-in-share");

        this.$shareRedirectUrl.on('change', () => 
            this.updateOption('shareRedirectUrl', this.$shareRedirectUrl.val() || 'share'));

        this.$loginRedirectUrl.on('change', () => 
            this.updateOption('loginRedirectUrl', this.$loginRedirectUrl.val() || 'login'));

        this.$showLoginInShare.on('change', () => 
            this.updateCheckboxOption('showLoginInShareTheme', this.$showLoginInShare));
    }

    optionsLoaded(options) {
        this.$shareRedirectUrl.val(options.shareRedirectUrl || 'share');
        this.$loginRedirectUrl.val(options.loginRedirectUrl || 'login');
        this.setCheckboxState(this.$showLoginInShare, options.showLoginInShareTheme);
    }
}
