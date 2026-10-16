// ===================================================
// KONEKSI UTAMA KE DATABASE ONLINE GOOGLE FIREBASE
// ===================================================
const firebaseConfig = {
    databaseURL: "https://voting-smp-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

// Mulai inisialisasi modul firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Variabel Penahan Sifat Sementara di Sisi Client
let siswaAktifNama = "";
let siswaAktifKelas = "";
const PASSWORD_ADMIN_RAHASIA = "adminrpl123"; 

// ===================================================
// LOGIKA UNTUK PEMILIH (CLIENT-SIDE VOTE)
// ===================================================

function prosesLogin(event) {
    event.preventDefault();
    const namaInput = document.getElementById("input-nama").value.trim();
    const kelasInput = document.getElementById("input-kelas").value;

    // CEK DATA KECURANGAN SECARA REAL-TIME DARI INTERNET SERVER
    database.ref('logDaftarPemilih/' + namaInput).once('value', function(snapshot) {
        if (snapshot.exists()) {
            alert("Sistem Menolak! Atas nama " + namaInput + " terdeteksi sudah pernah melakukan voting di HP/perangkat lain.");
        } else {
            // Jika aman, masukkan data ke bilik suara lokal
            siswaAktifNama = namaInput;
            siswaAktifKelas = kelasInput;

            document.getElementById("user-aktif").innerHTML = siswaAktifNama;
            document.getElementById("kelas-aktif").innerHTML = siswaAktifKelas;

            document.getElementById("layar-login").classList.add("sembunyi");
            document.getElementById("layar-voting").classList.remove("sembunyi");
        }
    });
}

function kirimSuara(idKandidat) {
    // Matikan tombol vote agar tidak memicu double data sewaktu koneksi lemot
    document.getElementById("btn-01").disabled = true;
    document.getElementById("btn-02").disabled = true;

    // 1. Tembak data nama ke tabel database audit 'logDaftarPemilih' di internet
    let dataPemilihBaru = {};
    dataPemilihBaru['logDaftarPemilih/' + siswaAktifNama] = {
        kelas: siswaAktifKelas,
        status: "Sudah Memilih"
    };
    database.ref().update(dataPemilihBaru);

    // 2. Tambah nilai perolehan suara paslon ke server melalui transaksi atomik aman
    database.ref('dataSuara/' + idKandidat).transaction(function(suaraSekarang) {
        return (suaraSekarang || 0) + 1;
    }, function(error, committed, snapshot) {
        if (committed) {
            alert("Suara dari " + siswaAktifNama + " (" + siswaAktifKelas + ") BERHASIL dikirim secara online!");
        } else {
            alert("Koneksi gagal, silakan coba beberapa saat lagi.");
        }
        
        // Pulihkan kondisi tombol dan tendang kembali ke halaman login depan
        document.getElementById("btn-01").disabled = false;
        document.getElementById("btn-02").disabled = false;
        risetUlangFormKeAwal();
    });
}

function risetUlangFormKeAwal() {
    document.getElementById("input-nama").value = "";
    document.getElementById("input-kelas").value = "";
    document.getElementById("layar-voting").classList.add("sembunyi");
    document.getElementById("layar-login").classList.remove("sembunyi");
    siswaAktifNama = "";
    siswaAktifKelas = "";
}

// ===================================================
// LOGIKA UNTUK PANEL MONITORING REAL-TIME ADMIN
// ===================================================

function aksesPanelAdmin() {
    const inputPassword = prompt("Masukkan Kata Sandi Otoritas Admin OSIS:");

    if (inputPassword === PASSWORD_ADMIN_RAHASIA) {
        alert("Akses Diterima! Membuka Dashboard sinkronisasi real-time.");
        
        document.getElementById("layar-login").classList.add("sembunyi");
        document.getElementById("layar-voting").classList.add("sembunyi");
        document.getElementById("layar-admin").classList.remove("sembunyi");

        // PASANG RADAR SINKRONISASI AKTIF (.on)
        // Fungsi ini memantau database Google tanpa henti. Jika ada HP yang klik vote, fungsi ini langsung jalan otomatis
        database.ref().on('value', function(snapshot) {
            const semuaData = snapshot.val() || {};
            
            const dataSuaraServer = semuaData.dataSuara || { kandidat1: 0, kandidat2: 0 };
            const logPemilihServer = semuaData.logDaftarPemilih || {};

            renderGrafikLive(dataSuaraServer);
            renderTabelLive(logPemilihServer);
        });

    } else if (inputPassword !== null) {
        alert("Akses Ditolak! Kata sandi salah.");
    }
}

function tutupPanelAdmin() {
    // Cabut radar pemantauan online (.off) agar menghemat RAM dan internet laptop
    database.ref().off();
    document.getElementById("layar-admin").classList.add("sembunyi");
    document.getElementById("layar-login").classList.remove("sembunyi");
}

function renderGrafikLive(dataSuara) {
    let vote01 = dataSuara.kandidat1 || 0;
    let vote02 = dataSuara.kandidat2 || 0;
    let totalSuara = vote01 + vote02;
    
    document.getElementById("suara-01").innerHTML = vote01;
    document.getElementById("suara-02").innerHTML = vote02;

    let persen01 = totalSuara > 0 ? Math.round((vote01 / totalSuara) * 100) : 0;
    let persen02 = totalSuara > 0 ? Math.round((vote02 / totalSuara) * 100) : 0;

    const bar01 = document.getElementById("bar-01");
    bar01.style.width = persen01 + "%";
    bar01.innerHTML = persen01 + "%";

    const bar02 = document.getElementById("bar-02");
    bar02.style.width = persen02 + "%";
    bar02.innerHTML = persen02 + "%";
}

function renderTabelLive(logDaftarPemilih) {
    const tbody = document.getElementById("isiTabelAudit");
    tbody.innerHTML = ""; 

    for (let namaSiswa in logDaftarPemilih) {
        const data = logDaftarPemilih[namaSiswa];
        const barisHTML = `
            <tr>
                <td><strong>${namaSiswa}</strong></td>
                <td>${data.kelas}</td>
                <td><span class="badge-success">${data.status}</span></td>
            </tr>
        `;
        tbody.innerHTML += barisHTML;
    }
}
