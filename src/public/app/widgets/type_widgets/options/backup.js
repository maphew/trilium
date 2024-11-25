import { t } from "../../../services/i18n.js";
import server from "../../../services/server.js";
import toastService from "../../../services/toast.js";
import OptionsWidget from "./options_widget.js";

const TPL = `
<div class="options-section">
    <h4>${t('backup.automatic_backup')}</h4>
    
    <p>${t('backup.automatic_backup_description')}</p>
    
    <ul style="list-style: none">
        <li>
            <label>
                <input type="checkbox" class="daily-backup-enabled form-check-input">
                ${t('backup.enable_daily_backup')}
            </label>
        </li>
        <li>    
            <label>
                <input type="checkbox" class="weekly-backup-enabled form-check-input">
                ${t('backup.enable_weekly_backup')}
            </label>
        </li>
        <li>
        <label>
            <input type="checkbox" class="monthly-backup-enabled form-check-input">
            ${t('backup.enable_monthly_backup')}
            </label>
        </li>
    </ul>
    
    <p>${t('backup.backup_recommendation')}</p>
</div>

<div class="options-section">
    <h4>${t('backup.backup_now')}</h4>
    
    <button class="backup-database-button btn">${t('backup.backup_database_now')}</button>
</div>

<div class="options-section">
    <h4>${t('backup.existing_backups')}</h4>
    
    <table class="table table-stripped">
        <colgroup>
            <col width="33%" />
            <col />
        </colgroup>
        <thead>
            <tr>
                <th>${t("backup.date-and-time")}</th>
                <th>${t("backup.path")}</th>
            </tr>
        </thead>
        <tbody class="existing-backup-list-items">
        </tbody>
    </table>

</div>
`;

export default class BackupOptions extends OptionsWidget {
    doRender() {
        this.$widget = $(TPL);

        this.$backupDatabaseButton = this.$widget.find(".backup-database-button");

        this.$backupDatabaseButton.on('click', async () => {
            const {backupFile} = await server.post('database/backup-database');

            toastService.showMessage(`${t('backup.database_backed_up_to')} ${backupFile}`, 10000);

            this.refresh();
        });

        this.$dailyBackupEnabled = this.$widget.find(".daily-backup-enabled");
        this.$weeklyBackupEnabled = this.$widget.find(".weekly-backup-enabled");
        this.$monthlyBackupEnabled = this.$widget.find(".monthly-backup-enabled");

        this.$dailyBackupEnabled.on('change', () =>
            this.updateCheckboxOption('dailyBackupEnabled', this.$dailyBackupEnabled));

        this.$weeklyBackupEnabled.on('change', () =>
            this.updateCheckboxOption('weeklyBackupEnabled', this.$weeklyBackupEnabled));

        this.$monthlyBackupEnabled.on('change', () =>
            this.updateCheckboxOption('monthlyBackupEnabled', this.$monthlyBackupEnabled));

        this.$existingBackupList = this.$widget.find(".existing-backup-list-items");
    }

    optionsLoaded(options) {
        this.setCheckboxState(this.$dailyBackupEnabled, options.dailyBackupEnabled);
        this.setCheckboxState(this.$weeklyBackupEnabled, options.weeklyBackupEnabled);
        this.setCheckboxState(this.$monthlyBackupEnabled, options.monthlyBackupEnabled);

        server.get("database/backups").then(backupFiles => {
            this.$existingBackupList.empty();

            if (!backupFiles.length) {
                this.$existingBackupList.append($(`
                    <tr>
                        <td class="empty-table-placeholder" colspan="2">${t('backup.no_backup_yet')}</td>
                    </tr>
                `));

                return;
            }

            // Sort the backup files by modification date & time in a desceding order
            backupFiles.sort((a, b) => {
                if (a.mtime < b.mtime) return 1;
                if (a.mtime > b.mtime) return -1;
                return 0;
            });

            const dateTimeFormatter = new Intl.DateTimeFormat(navigator.language, {
                dateStyle: "medium",
                timeStyle: "medium"
            });

            for (const {filePath, mtime} of backupFiles) {
                this.$existingBackupList.append($(`
                    <tr>
                        <td>${(mtime) ? dateTimeFormatter.format(new Date(mtime)) : "-"}</td>
                        <td>${filePath}</td>
                    </tr>
                `));
            }
        });
    }
}
