#!/usr/bin/env python3
"""Builds Lampa for LG webOS as a small app that opens your Lampac server straight away: Lampa-webos.ipk.

    python3 lampa/build_webos.py                        # the server from config.properties (lampa_server=)
    python3 lampa/build_webos.py http://192.168.1.77:9119
    python3 lampa/build_webos.py --install 192.168.1.50  # build, then install on the TV like webos/install.py

Packed like webos/build.py (no LG tools). Free My TV opens it with {card, media, source}; it passes them to Lampa as
?card=..., and lampa/fmtv_deeplink.js (a Lampac plugin) handles them when Lampa is already open.
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(ROOT, 'webos'))
import build  # noqa: E402
import install  # noqa: E402

IPK = os.path.join(ROOT, 'Lampa-webos.ipk')


def server_from_config():
    path = os.path.join(ROOT, 'config.properties')
    if os.path.exists(path):
        with open(path, encoding='utf-8') as f:
            for line in f:
                if line.strip().startswith('lampa_server='):
                    return line.split('=', 1)[1].strip()
    return ''


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    tv = args.pop() if '--install' in sys.argv and args else None
    server = (args[0] if args else server_from_config()).rstrip('/')
    if not server.startswith('http'):
        sys.exit('Which server? Set lampa_server= in config.properties or pass it: python3 lampa/build_webos.py http://host:port')
    src = os.path.join(HERE, 'webos')
    with open(os.path.join(src, 'appinfo.json'), encoding='utf-8') as f:
        info = json.load(f)
    app = {'server.js': ('window.LAMPA_SERVER = %s;\n' % json.dumps(server)).encode('utf-8')}
    for name in ('appinfo.json', 'index.html', 'icon.png', 'largeIcon.png'):
        with open(os.path.join(src, name), 'rb') as f:
            app[name] = f.read()
    base = 'usr/palm/applications/' + info['id']
    entries = [('usr', None), ('usr/palm', None), ('usr/palm/applications', None), (base, None)]
    entries += [(base + '/' + name, app[name]) for name in sorted(app)]
    package = json.dumps({'id': info['id'], 'version': info['version'], 'app': info['id']}, indent=2).encode('utf-8')
    entries += [('usr/palm/packages', None), ('usr/palm/packages/' + info['id'], None),
                ('usr/palm/packages/' + info['id'] + '/packageinfo.json', package)]
    control = ('Package: %s\nVersion: %s\nSection: misc\nPriority: optional\nArchitecture: all\nInstalled-Size: %d\n'
               'Maintainer: Free My TV <https://freemytv.io>\nDescription: Lampa from your Lampac server.\n'
               'webOS-Package-Format-Version: 2\nwebOS-Packager-Version: 1.0.0\n'
               % (info['id'], info['version'], sum(len(d) for d in app.values())))
    data = build.ar([('debian-binary', b'2.0\n'), ('control.tar.gz', build.tar_gz([('control', control.encode('utf-8'))])),
                     ('data.tar.gz', build.tar_gz(entries))])
    with open(IPK, 'wb') as f:
        f.write(data)
    print('Built %s (%s, opens %s)' % (os.path.basename(IPK), info['id'], server))
    if tv:
        install.IPK, install.APP_ID = IPK, info['id']
        sys.argv = [sys.argv[0], tv]
        install.main()


if __name__ == '__main__':
    main()
