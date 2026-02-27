import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';

export const RingMyBudsRow = GObject.registerClass({
    GTypeName: 'RingMyBudsRow',
    Properties: {
        'status': GObject.ParamSpec.string(
            'status', 'Status', 'Single/Right earbud status',
            GObject.ParamFlags.READWRITE | GObject.ParamFlags.EXPLICIT_NOTIFY,
            'stopped'
        ),
        'status-left': GObject.ParamSpec.string(
            'status-left', 'Status Left', 'Left earbud status',
            GObject.ParamFlags.READWRITE | GObject.ParamFlags.EXPLICIT_NOTIFY,
            'stopped'
        ),
    },
}, class RingMyBudsRow extends Adw.ActionRow {
    _init(_, params = {}) {
        const {title = _('Find my earbuds'), dual = false, ...args} = params;
        super._init({title, ...args});

        this._gettext = _;
        this._dual = dual;

        this._status = 'stopped';
        this._statusLeft = 'stopped';

        this._buttonContent = new Adw.ButtonContent({
            icon_name: 'bbm-play-symbolic',
            label: _('Play'),
        });

        this._button = new Gtk.Button({
            valign: Gtk.Align.CENTER,
            child: this._buttonContent,
            css_classes: ['suggested-action'],
        });

        this._button.connect('clicked', () => {
            if (this.status === 'playing')
                this._stop();
            else
                this._confirmAndPlay();
        });

        if (dual) {
            this._container = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL, spacing: 18});

            this._buttonContentLeft = new Adw.ButtonContent({
                icon_name: 'bbm-play-symbolic',
                label: _('Play'),
            });
            this._buttonLeft = new Gtk.Button({
                valign: Gtk.Align.CENTER,
                child: this._buttonContentLeft,
                css_classes: ['suggested-action'],
            });

            const leftLabel = new Gtk.Label({label: 'L', xalign: 0, css_classes: ['heading']});
            const leftBox = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL, spacing: 6});
            leftBox.append(leftLabel);
            leftBox.append(this._buttonLeft);

            const rightLabel = new Gtk.Label({label: 'R', xalign: 0, css_classes: ['heading']});
            const rightBox = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL, spacing: 6});
            rightBox.append(rightLabel);
            rightBox.append(this._button);

            this._container.append(leftBox);
            this._container.append(rightBox);

            this.add_suffix(this._container);

            this._buttonLeft.connect('clicked', () => {
                if (this.statusLeft === 'playing')
                    this._stop('left');
                else
                    this._confirmAndPlay(true);
            });
        } else {
            this.add_suffix(this._button);
            this.activatable_widget = this._button;
        }
    }

    _updateStatus(state, isLeft = false) {
        const _ = this._gettext;
        const buttonContent = isLeft ? this._buttonContentLeft : this._buttonContent;

        if (state === 'playing') {
            buttonContent.icon_name = 'bbm-stop-symbolic';
            buttonContent.label = _('Stop');
        } else if (state === 'stopped') {
            buttonContent.icon_name = 'bbm-play-symbolic';
            buttonContent.label = _('Play');
        } else {
            return;
        }

        if (isLeft)
            this._statusLeft = state;
        else
            this._status = state;
    }

    get status() {
        return this._status;
    }

    set status(state) {
        if (this._status === state)
            return;

        this._updateStatus(state);
    }

    get statusLeft() {
        return this._statusLeft;
    }

    set statusLeft(state) {
        if (this._statusLeft === state)
            return;

        this._updateStatus(state, true);
    }

    _confirmAndPlay(isLeft = false) {
        const _ = this._gettext;
        const dialog = new Adw.AlertDialog({
            heading: _('Continue?'),
            body: _(
                'Your earbuds/headset may be in use. Be sure to remove them from your ears ' +
                'before you continue. A loud sound will be played which could be ' +
                'uncomfortable for anyone wearing them.'
            ),
        });

        dialog.add_response('cancel', _('Cancel'));
        dialog.add_response('continue', _('Play'));

        dialog.set_response_appearance('continue', Adw.ResponseAppearance.SUGGESTED);
        dialog.set_default_response('continue');
        dialog.set_close_response('cancel');

        dialog.connect('response', (_dialog, response) => {
            if (response === 'continue')
                this._play(isLeft);
        });

        dialog.present(this.get_root());
    }

    _play(isLeft) {
        this._updateStatus('playing', isLeft);
        this.notify(isLeft ? 'status-left' : 'status');
    }

    _stop(isLeft) {
        this._updateStatus('stopped', isLeft);
        this.notify(isLeft ? 'status-left' : 'status');
    }
});
