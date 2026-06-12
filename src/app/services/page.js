'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Wrench, 
  ShieldCheck, 
  Zap, 
  Calendar, 
  Clock, 
  Phone, 
  MapPin, 
  Menu, 
  X, 
  Mail, 
  Globe, 
  Share2,
  CheckCircle2,
  Wind,
  Paintbrush,
  Gauge,
  Cpu,
  Sparkles,
  Search,
  BookOpen
} from 'lucide-react';
import '../landing.css';
import './services.css';

export default function ServicesPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [customer, setCustomer] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    // Kiểm tra xem khách hàng đã đăng nhập chưa
    fetch('/api/auth/customer/me')
      .then(res => res.json())
      .then(data => {
        if (data.customer) {
          setCustomer(data.customer);
        }
      })
      .catch(() => {});
  }, []);

  const categories = [
    { id: 'all', name: 'TẤT CẢ DỊCH VỤ' },
    { id: 'maintenance', name: 'BẢO DƯỠNG & CHĂM SÓC' },
    { id: 'repair', name: 'SỬA CHỮA CHUYÊN SÂU' },
    { id: 'upgrade', name: 'NÂN CẤP & ĐỘ XE' }
  ];

  const servicesData = [
    {
      id: 'routine-maintenance',
      category: 'maintenance',
      title: 'Bảo Dưỡng Định Kỳ Cấp Độ Cao',
      icon: <ShieldCheck size={26} />,
      img: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=800&q=80',
      desc: 'Bảo dưỡng định kỳ là chìa khóa giúp xế yêu luôn vận hành êm ái, kéo dài tuổi thọ động cơ và ngăn chặn những hỏng hóc lớn ngoài ý muốn. Tại Trường Phát, chúng tôi thực hiện quy trình kiểm tra 30 điểm an toàn nghiêm ngặt từ máy gầm, điện tử cho đến an toàn phanh.',
      price: 'Chỉ từ 350.000 VNĐ (Tùy cấp độ xe)',
      highlights: [
        'Thay nhớt máy & lọc nhớt chính hãng, phù hợp từng dòng xe.',
        'Kiểm tra & vệ sinh hệ thống lọc gió động cơ, lọc gió điều hòa.',
        'Đo đạc kiểm tra hiệu suất phanh, độ mòn má phanh và đĩa phanh.',
        'Kiểm tra ắc quy, điện áp sạc và tình trạng rò rỉ điện.',
        'Kiểm tra toàn bộ chất lỏng: dầu phanh, dầu trợ lực, nước làm mát.',
        'Đọc lỗi lỗi kỹ thuật bằng máy quét OBDII thế hệ mới nhất.'
      ],
      steps: [
        { name: 'Tiếp nhận xe', desc: 'Ghi nhận tình trạng xe từ chủ sở hữu và lập biên bản tiếp nhận.' },
        { name: 'Khảo sát & Quét lỗi', desc: 'Đo áp lực phanh, kiểm tra gầm và quét lỗi phần mềm.' },
        { name: 'Báo giá dịch vụ', desc: 'Gửi báo giá minh bạch chi tiết vật tư, phụ tùng thay thế.' },
        { name: 'Bảo dưỡng & Giao xe', desc: 'Kỹ thuật viên thực hiện, kiểm tra chất lượng cuối cùng và bàn giao.' }
      ]
    },
    {
      id: 'engine-chassis-repair',
      category: 'repair',
      title: 'Sửa Chữa Máy Gầm Chuyên Sâu',
      icon: <Wrench size={26} />,
      img: 'https://images.unsplash.com/photo-1517524206127-48bbd363f3d7?auto=format&fit=crop&w=800&q=80',
      desc: 'Hệ thống máy gầm hoạt động không tốt sẽ gây ra tiếng ồn lạ, mất ổn định hướng đi hoặc rò rỉ dầu thủy lực gây mất an toàn nghiêm trọng. Gara Trường Phát cung cấp dịch vụ chẩn đoán chính xác lỗi, đại tu động cơ và phục hồi hệ thống treo gầm chất lượng cao.',
      price: 'Kiểm tra miễn phí - Báo giá theo thực tế',
      highlights: [
        'Đại tu động cơ, xử lý triệt để hiện tượng hao nhớt, khói đen.',
        'Sửa chữa hộp số sàn, hộp số tự động bị giật, trễ số.',
        'Thay thế rô-tuyn lái, rô-tuyn cân bằng, cao su gầm giảm chấn.',
        'Phục hồi thước lái điện, thước lái thủy lực bị chảy dầu, rơ lệch.',
        'Nâng cấp & thay thế hệ thống giảm chấn (phuộc nhún) cao cấp.',
        'Khắc phục tiếng kêu cạch cạch dưới gầm xe triệt để 100%.'
      ],
      steps: [
        { name: 'Thử xe & Khảo sát', desc: 'Lái thử để thẩm định tiếng ồn và cảm giác lái thực tế.' },
        { name: 'Hạ gầm kiểm tra', desc: 'Đưa lên cầu nâng, tháo dỡ các chi tiết nghi vấn để đo đạc.' },
        { name: 'Lên cấu hình linh kiện', desc: 'Tư vấn phụ tùng thay thế (Chính hãng hoặc OEM chất lượng).' },
        { name: 'Sửa chữa & Kiểm tra', desc: 'Lắp ráp căn chỉnh góc đặt bánh xe và bàn giao thành phẩm.' }
      ]
    },
    {
      id: 'air-conditioning-electrical',
      category: 'repair',
      title: 'Sửa Chữa Hệ Thống Điện & Điện Lạnh',
      icon: <Wind size={26} />,
      img: 'https://images.unsplash.com/photo-1621359982464-325d7065969a?auto=format&fit=crop&w=800&q=80',
      desc: 'Thời tiết nắng nóng tại Việt Nam khiến hệ thống điều hòa hoạt động liên tục dễ dẫn tới mất lạnh, mát không sâu hoặc có mùi ẩm mốc. Chúng tôi chuyên bảo dưỡng điều hòa nội soi không tháo taplo và xử lý các sự cố chập cháy hệ thống điện phức tạp nhất.',
      price: 'Nạp gas từ 150.000 VNĐ · Vệ sinh nội soi dàn lạnh 600.000 VNĐ',
      highlights: [
        'Đo áp suất nén gas lạnh, kiểm tra rò rỉ đường ống dẫn bằng thiết bị chuyên dụng.',
        'Vệ sinh nội soi dàn lạnh bằng vòi phun áp lực vi sinh, khử trùng cabin.',
        'Sửa chữa, thay thế lốc lạnh (máy nén), giàn nóng, giàn lạnh.',
        'Kiểm tra chẩn đoán hệ thống cảm biến nhiệt độ và van tiết lưu.',
        'Xử lý lỗi hệ thống điện điều khiển, hộp đen ECU động cơ và điện thân xe.',
        'Phục hồi máy phát điện, củ đề khởi động xe ô tô.'
      ],
      steps: [
        { name: 'Đo áp gas lạnh', desc: 'Dùng đồng hồ chuyên dụng kiểm tra áp suất cao & thấp áp.' },
        { name: 'Nội soi dàn lạnh', desc: 'Dùng camera luồn vào dàn lạnh để xác định mức độ bám bẩn.' },
        { name: 'Xử lý hóa chất', desc: 'Sử dụng dung dịch tẩy rửa sinh học cao cấp, an toàn sức khỏe.' },
        { name: 'Bơm gas & Kiểm tra', desc: 'Bơm hút chân không nạp gas R134a tiêu chuẩn nhà sản xuất.' }
      ]
    },
    {
      id: 'car-painting',
      category: 'repair',
      title: 'Dịch Vụ Sơn Dặm Vá & Phục Hồi Bề Mặt Sơn',
      icon: <Paintbrush size={26} />,
      img: 'https://images.unsplash.com/photo-1597839219216-a773cb2473e4?auto=format&fit=crop&w=800&q=80',
      desc: 'Bảo vệ chiếc xe của bạn khỏi những vết xước mất thẩm mỹ do va quẹt. Trường Phát sử dụng công nghệ pha màu vi tính chính xác 99%, kết hợp quy trình sơn sấy khép kín trong phòng hấp hồng ngoại hiện đại giúp lớp sơn bóng bẩy, bền màu và chịu lực thời tiết cực tốt.',
      price: 'Sơn dặm vá nhanh chỉ từ 500.000 VNĐ/chi tiết',
      highlights: [
        'Sơn dặm vá nhanh lấy liền trong ngày cho các vết xước nhỏ góc cản.',
        'Sơn đổi màu toàn diện xe, đăng ký thủ tục nhanh chóng đúng quy định.',
        'Sơn lazang (mâm xe), sơn cùm phanh thể thao cao cấp tạo điểm nhấn.',
        'Pha sơn vi tính với dải code màu chính xác của các hãng xe phổ thông đến xe sang.',
        'Hệ thống sơn phủ bảo vệ 2K bóng chống tia UV, hạn chế trầy xước.',
        'Bảo hành bong tróc sơn do lỗi kỹ thuật lên đến 2 năm.'
      ],
      steps: [
        { name: 'Làm sạch & Mài nhám', desc: 'Làm sạch bề mặt xước móp và mài nhám tạo độ bám.' },
        { name: 'Bả matit & Sơn lót', desc: 'Điền đầy vết móp bằng matit chất lượng cao và phun sơn lót.' },
        { name: 'Phun sơn màu vi tính', desc: 'Sơn màu chính trong phòng sơn hấp cách bụi hoàn toàn.' },
        { name: 'Sơn bóng & Đánh bóng', desc: 'Phủ sơn bóng bảo vệ và đánh bóng đồng màu các chi tiết xung quanh.' }
      ]
    },
    {
      id: 'panel-beating',
      category: 'repair',
      title: 'Gò Hàn Đồng & Phục Hồi Xe Tai Nạn Nặng',
      icon: <Cpu size={26} />,
      img: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=800&q=80',
      desc: 'Khi xe bị tai nạn móp méo nặng, việc phục hồi hình dáng hình học khung sườn về nguyên bản là điều cực kỳ quan trọng để đảm bảo tính an toàn chịu lực của xe. Chúng tôi sở hữu máy kéo nắn khung chuyên dụng cùng thợ đồng tay nghề kỳ cựu trên 15 năm kinh nghiệm.',
      price: 'Đánh giá thiệt hại thực tế - Hỗ trợ bảo hiểm liên kết',
      highlights: [
        'Kéo nắn cân bằng khung sườn xe bị đâm đụng, tai nạn móp méo bằng máy kéo định hình.',
        'Gò nắn phục hồi các chi tiết vỏ tôn, tai xe, cửa xe bằng máy hàn rút tôn cao cấp.',
        'Thay thế các cụm chi tiết thân vỏ chính hãng nhanh chóng, khít khao.',
        'Hàn argon, hàn tích công nghệ cao các chi tiết hợp kim nhôm vỏ xe cao cấp.',
        'Hỗ trợ làm thủ tục giám định bảo hiểm từ đầu đến cuối nhanh gọn.',
        'Kiểm tra thông số kỹ thuật xe bằng thước đo la-ze đo khung gầm 3 chiều.'
      ],
      steps: [
        { name: 'Đo đạc hình học', desc: 'Sử dụng thước laser kiểm tra độ lệch trục và vặn xoắn khung gầm.' },
        { name: 'Kéo nắn sườn', desc: 'Neo giữ cố định xe trên bệ đỡ và dùng kích thủy lực kéo nắn.' },
        { name: 'Gò tạo dáng vỏ', desc: 'Dùng búa đồng chuyên dụng gò nắn chi tiết tôn đạt độ phẳng tối ưu.' },
        { name: 'Bàn giao kiểm tra', desc: 'Kiểm tra độ khít các khe hở cửa, nắp capo và chuyển khâu sơn.' }
      ]
    },
    {
      id: 'exterior-detailing',
      category: 'maintenance',
      title: 'Chăm Sóc Ngoại Thất & Đánh Bóng Phủ Ceramic',
      icon: <Sparkles size={26} />,
      img: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=800&q=80',
      desc: 'Giữ cho xế yêu luôn lộng lẫy và tỏa sáng rực rỡ như vừa xuất xưởng. Quy trình hiệu chỉnh bề mặt sơn 3 bước giúp xóa bỏ 90% các vết xước xoáy cám trên lớp sơn bóng, sau đó được bảo vệ bằng lớp phủ Ceramic tinh thể thạch anh cao cấp chống bám nước và tia cực tím.',
      price: 'Gói đánh bóng hiệu chỉnh từ 1.200.000 VNĐ · Phủ Ceramic từ 4.500.000 VNĐ',
      highlights: [
        'Hiệu chỉnh bề mặt sơn, loại bỏ hoàn toàn xước dăm, xước xoáy và đốm nước mưa.',
        'Tẩy ố kính chiếu hậu, kính chắn gió giúp cải thiện tầm nhìn tối đa khi đi mưa đêm.',
        'Phủ Ceramic 9H cao cấp tạo hiệu ứng lá sen kháng nước mạnh mẽ, chống bám bụi bẩn.',
        'Bảo dưỡng và phục hồi các chi tiết nhựa nhám ngoại thất bị bạc màu do nắng.',
        'Vệ sinh sâu lazang và tẩy rỉ sét ố vàng trên phanh cùm bánh xe.',
        'Khử mùi diệt khuẩn cabin bằng công nghệ xông tinh dầu ion.'
      ],
      steps: [
        { name: 'Rửa xe chi tiết', desc: 'Rửa 3 xô tiêu chuẩn Detailing, tẩy chất bẩn sắt, đất sét Clay bề mặt.' },
        { name: 'Hiệu chỉnh sơn 3 bước', desc: 'Sử dụng máy DA/RO xóa xước dăm, phục hồi độ trong của lớp bóng.' },
        { name: 'Tẩy dầu chuyên dụng', desc: 'Sử dụng cồn tinh khiết loại bỏ lớp sáp đánh bóng chuẩn bị phủ.' },
        { name: 'Phủ bóng bảo vệ', desc: 'Thoa phủ đều dung dịch Ceramic tinh thể thạch anh và sấy nhiệt hồng ngoại.' }
      ]
    },
    {
      id: 'engine-bay-cleaning',
      category: 'maintenance',
      title: 'Vệ Sinh & Bảo Dưỡng Khoang Động Cơ Bằng Hơi Nước Nóng',
      icon: <Gauge size={26} />,
      img: 'https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=800&q=80',
      desc: 'Khoang máy bám đầy bụi đất, dầu mỡ lâu ngày sẽ làm giảm khả năng thoát nhiệt của động cơ, gây hao nhiên liệu và là nơi trú ngụ lý tưởng của chuột cắn phá dây điện. Chúng tôi sử dụng hơi nước nóng 120°C giúp đánh tan mỡ dầu bám cứng mà không gây hại cho mạch điện tử nhạy cảm.',
      price: 'Vệ sinh chi tiết chỉ từ 500.000 VNĐ đến 800.000 VNĐ',
      highlights: [
        'Che chắn toàn bộ giắc điện nhạy cảm, cổ hút gió trước khi thao tác vệ sinh.',
        'Dùng máy phun hơi nước nóng cao áp nhập khẩu từ Ý làm mềm dầu mỡ bám lâu ngày.',
        'Sử dụng chổi cọ và dung dịch chuyên dụng tẩy sạch cặn bám sâu trong hốc máy.',
        'Làm khô khoang máy bằng súng xì khô áp lực và khăn Microfiber siêu thấm.',
        'Dưỡng bóng các chi tiết cao su, nhựa máy bằng dung dịch phục hồi bảo vệ của 3M.',
        'Phun hoạt chất chống chuột cao cấp giúp bảo vệ khoang máy lên đến 3 tháng.'
      ],
      steps: [
        { name: 'Che chắn giắc điện', desc: 'Dùng băng keo nilon chuyên dụng bọc kín hộp cầu chì, giắc điện hở.' },
        { name: 'Phun hơi nóng 120°C', desc: 'Phun hơi nước nóng áp lực để làm tan chảy dầu bám cứng đầu.' },
        { name: 'Cọ rửa chi tiết', desc: 'Dùng chổi cọ mềm quét dung dịch tẩy rửa máy chuyên sâu.' },
        { name: 'Sấy khô & Dưỡng máy', desc: 'Làm khô hoàn toàn các linh kiện điện và xịt phủ dưỡng chất bảo vệ cao su.' }
      ]
    },
    {
      id: 'off-road-upgrade',
      category: 'upgrade',
      title: 'Thiết Kế & Nâng Cấp Xe Địa Hình Chuyên Nghiệp',
      icon: <BookOpen size={26} />,
      img: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80',
      desc: 'Thành tựu đỉnh cao làm nên tên tuổi Trường Phát: Nhà vô địch Victory Challenge Sailun Cup 2024. Chúng tôi cung cấp dịch vụ độ xe bán tải, xe SUV off-road chuyên nghiệp với cấu hình phuộc nhún thể thao, mâm lốp dã ngoại, cản bảo vệ thép và tời cứu hộ chính hãng bảo đảm đăng kiểm.',
      price: 'Tư vấn chuyên sâu - Cấu hình may đo theo nhu cầu của chủ xe',
      highlights: [
        'Nâng cấp hệ thống phuộc giảm xóc hiệu năng cao (BP-51, King Shocks, Profender).',
        'Lắp đặt tời cứu hộ điện (Warn, Runva) chịu tải lớn, thiết kế cản thép chịu lực.',
        'Độ ống thở lấy gió cao giúp xe lội nước sâu an toàn không bị thủy kích.',
        'Thay thế mâm độ thể thao (Fuel, Method) và lốp gai địa hình (AT, MT) bám đường cực tốt.',
        'Nâng cấp hệ thống đèn LED trợ sáng tăng tầm nhìn ban đêm (nhập khẩu chính hãng).',
        'Cân chỉnh độ chụm bánh xe và cân bằng động bằng máy Hunter công nghệ Mỹ.'
      ],
      steps: [
        { name: 'Khảo sát nhu cầu', desc: 'Tìm hiểu thói quen sử dụng xe (On-road/Off-road nhẹ/Off-road khắc nghiệt).' },
        { name: 'Lên bản vẽ cấu hình', desc: 'Tính toán trọng tải, chiều cao nâng gầm và lựa chọn thiết bị phù hợp.' },
        { name: 'Thi công lắp ráp', desc: 'Kỹ thuật viên chuyên đua xe trực tiếp lắp đặt phụ kiện tỉ mỉ, chính xác.' },
        { name: 'Thử nghiệm thực địa', desc: 'Lái thử nghiệm trên các địa hình dốc, gập ghềnh và cân chỉnh phuộc tối ưu.' }
      ]
    }
  ];

  const filteredServices = activeCategory === 'all' 
    ? servicesData 
    : servicesData.filter(s => s.category === activeCategory);

  return (
    <div className="landing-body services-page-wrapper">
      
      {/* Navbar */}
      <nav className="navbar">
        <div className="logo">GARA TRƯỜNG PHÁT</div>
        
        <div className={`nav-links ${isMenuOpen ? 'active' : ''}`}>
          <Link href="/">Trang chủ</Link>
          <Link href="/services" className="active-nav">Dịch vụ</Link>
          <Link href="/#booking">Đặt lịch</Link>
          <Link href="/#contact">Liên hệ</Link>
          {customer ? (
            <Link href="/customer/profile" className="btn-nav-login">
              Tài khoản
            </Link>
          ) : (
            <Link href="/customer/auth" className="btn-nav-login">
              Đăng nhập / Đăng ký
            </Link>
          )}
        </div>

        <button 
          className="menu-toggle" 
          onClick={() => setIsMenuOpen(!isMenuOpen)} 
          style={{ display: 'none', background: 'none', border: 'none', color: 'white' }}
        >
          {isMenuOpen ? <X /> : <Menu />}
        </button>
      </nav>

      {/* Services Hero Section */}
      <section className="services-hero">
        <div className="services-hero-content">
          <h1>Danh Mục Dịch Vụ Đẳng Cấp</h1>
          <p>
            Gara Trường Phát cam kết mang đến những giải pháp chăm sóc sửa chữa ô tô tối ưu bằng công nghệ hiện đại, linh kiện chính hãng cùng quy trình phục vụ tận tâm.
          </p>
        </div>
      </section>

      {/* Breadcrumb */}
      <div className="breadcrumb-container">
        <ul className="breadcrumb-list">
          <li className="breadcrumb-item"><Link href="/">Trang chủ</Link></li>
          <li className="breadcrumb-separator">/</li>
          <li className="breadcrumb-item active">Danh sách dịch vụ</li>
        </ul>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs-container">
        {categories.map(cat => (
          <button 
            key={cat.id}
            className={`filter-tab ${activeCategory === cat.id ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat.id)}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Main Services List */}
      <section className="services-list-section">
        <div className="services-list-container">
          {filteredServices.length > 0 ? (
            filteredServices.map((service, index) => (
              <div key={service.id} className="service-detail-card" id={service.id}>
                
                {/* Image panel */}
                <div className="service-detail-image">
                  <img 
                    src={service.img} 
                    alt={service.title} 
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=800&auto=format&fit=crop';
                    }}
                  />
                </div>

                {/* Info panel */}
                <div className="service-detail-info">
                  <div className="service-badge-icon">
                    {service.icon}
                  </div>
                  <h2 className="service-detail-title">{service.title}</h2>
                  <p className="service-detail-desc">{service.desc}</p>
                  
                  {/* Pricing */}
                  <div className="service-price-box">
                    <span className="price-label">Giá Tham Khảo</span>
                    <span className="price-value">{service.price}</span>
                  </div>

                  {/* Highlights list */}
                  <div className="service-highlights">
                    <h3 className="highlight-title">
                      <CheckCircle2 size={16} /> Các Hạng Mục Chi Tiết
                    </h3>
                    <ul className="highlight-list">
                      {service.highlights.map((item, idx) => (
                        <li key={idx} className="highlight-item">
                          <CheckCircle2 size={14} />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Process Timeline */}
                  <div className="service-process">
                    <h3 className="process-title">Quy Trình Phục Vụ 4 Bước</h3>
                    <div className="process-steps">
                      {service.steps.map((step, idx) => (
                        <div key={idx} className="process-step">
                          <div className="step-num">{idx + 1}</div>
                          <span className="step-text">{step.name}</span>
                          <span className="step-desc">{step.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CTA button */}
                  <Link href="/#booking" className="btn-lp btn-lp-primary service-cta-btn">
                    Đặt lịch hẹn ngay
                  </Link>

                </div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--lp-text-secondary)' }}>
              Không tìm thấy dịch vụ nào phù hợp với danh mục đã chọn.
            </div>
          )}
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="why-choose-services">
        <div className="section-title">
          <h2 className="premium-title">TẠI SAO CHỌN TRƯỜNG PHÁT?</h2>
          <p>Uy Tín Tạo Nên Thương Hiệu - Tận Tâm Trong Từng Chi Tiết Nhỏ</p>
        </div>

        <div className="why-services-grid">
          <div className="why-services-card">
            <div className="why-services-icon">
              <ShieldCheck size={32} />
            </div>
            <h3>100% Chính Hãng</h3>
            <p>Toàn bộ phụ tùng dầu nhớt, nước làm mát thay thế đều có hóa đơn nguồn gốc rõ ràng và bảo hành đúng tiêu chuẩn nhà sản xuất.</p>
          </div>

          <div className="why-services-card">
            <div className="why-services-icon">
              <Wrench size={32} />
            </div>
            <h3>Thiết Bị Hiện Đại</h3>
            <p>Trang bị máy quét lỗi đa năng, cầu nâng cân chỉnh Hunter đời mới, phòng sơn hấp hiện đại hỗ trợ chẩn đoán chính xác và nhanh chóng.</p>
          </div>

          <div className="why-services-card">
            <div className="why-services-icon">
              <Sparkles size={32} />
            </div>
            <h3>Kinh Nghiệm Thực Chiến</h3>
            <p>Đội ngũ kỹ thuật viên sửa chữa và thiết kế xe chuyên nghiệp với kinh nghiệm cọ xát tại các cuộc đua off-road quốc tế.</p>
          </div>

          <div className="why-services-card">
            <div className="why-services-icon">
              <Clock size={32} />
            </div>
            <h3>Minh Bạch & Tận Tâm</h3>
            <p>Chủ xe được xem trực tiếp quá trình sửa chữa, mọi phát sinh về chi phí đều được liên hệ xin ý kiến trước khi tiến hành thực hiện.</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="services-cta-section">
        <div className="services-cta-container">
          <h2>Xế Yêu Của Bạn Cần Chăm Sóc?</h2>
          <p>
            Đừng ngần ngại liên hệ đặt lịch bảo dưỡng trực tuyến ngay hôm nay để nhận được sự tư vấn chuyên sâu cùng các chương trình ưu đãi tri ân khách hàng đặc biệt từ Gara Trường Phát.
          </p>
          <Link href="/#booking" className="btn-lp btn-lp-primary" style={{ padding: '1.2rem 3.5rem', fontSize: '1rem', letterSpacing: '1px' }}>
            ĐẶT LỊCH HẸN BẢO DƯỠNG
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="main-footer">
        <div className="footer-top">
          <div className="footer-col about-col">
            <div className="footer-logo-wrapper">
              <div className="footer-logo-box">
                <Wrench size={32} color="#3b7dd8" />
                <span className="logo-text">TRƯỜNG PHÁT</span>
              </div>
            </div>
            <h3 className="footer-title">GARAGE Ô TÔ TRƯỜNG PHÁT</h3>
            <p className="footer-about-text">
              Nếu Quý khách cần tư vấn hoặc đặt lịch <strong>sửa chữa – bảo dưỡng – làm máy, gầm, điện, điện lạnh, đồng, sơn ô tô</strong>, vui lòng liên hệ trực tiếp:
            </p>
            <ul className="contact-list-detailed">
              <li><MapPin size={16} /> <strong>Địa chỉ:</strong> 123 Đường Số 7, Bình Trị Đông B, Bình Tân, TP.HCM</li>
              <li><Phone size={16} /> <strong>Hotline:</strong> 0909 123 456</li>
              <li><Mail size={16} /> <strong>Email:</strong> contact@garatruongphat.com</li>
              <li><Globe size={16} /> <strong>Website chính thức:</strong> garatruongphat.com</li>
              <li><Share2 size={16} /> <strong>Fanpage:</strong> facebook.com/garatruongphat</li>
            </ul>
            
            <div className="footer-warnings">
              <p>⚠️ <strong>Lưu ý quan trọng:</strong> Garage Trường Phát chỉ có một website duy nhất để tiếp nhận và theo dõi đặt lịch của Quý khách.</p>
              <p>👉 Quý khách vui lòng đặt lịch trực tiếp trên website để nhận được ưu đãi và hỗ trợ nhanh nhất.</p>
            </div>
          </div>

          <div className="footer-col">
            <h3 className="footer-col-title">DỊCH VỤ</h3>
            <ul className="footer-links-list">
              <li>Bảo Dưỡng Khoang Động Cơ Ô tô</li>
              <li>Bảo Dưỡng Định Kỳ</li>
              <li className="highlight-link">Sửa Chữa Máy Gầm</li>
              <li>Sửa Chữa Điện Lạnh</li>
              <li>Báo Giá Gói Bảo Dưỡng Cơ Bản</li>
              <li>Dịch Vụ Sơn Dặm Vá Xe Ô Tô</li>
              <li>Phục Hồi Đồng Thân Xe</li>
              <li>Chăm Sóc Ngoại Thất</li>
              <li>Chăm Sóc Khoang Máy</li>
              <li>Bảo Dưỡng Nội Thất Ô Tô</li>
              <li>Dịch Vụ Cứu Hộ - Bảo Hiểm Xe</li>
            </ul>
          </div>

          <div className="footer-col">
            <h3 className="footer-col-title">CHÍNH SÁCH</h3>
            <ul className="footer-links-list">
              <li>Chính sách bảo hành dịch vụ</li>
              <li>Chính sách đổi trả & hoàn tiền</li>
              <li>Chính sách đặt lịch & hủy lịch</li>
              <li>Chính sách bảo mật thông tin</li>
              <li>Chính sách thanh toán</li>
              <li>Chính sách ưu đãi & thành viên</li>
              <li>Chính sách bảo hành phụ tùng</li>
              <li>Chính sách đặt lịch – hủy lịch - giữ xe</li>
              <li>Chính sách an toàn & trách nhiệm</li>
              <li>Chính sách lưu kho & phụ tùng</li>
              <li>Chính sách giải quyết khiếu nại</li>
            </ul>
          </div>

          <div className="footer-col fanpage-col">
            <h3 className="footer-col-title">FANPAGE</h3>
            <div className="facebook-widget-mock">
              <div className="fb-cover">
                <img src="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=400&auto=format&fit=crop" alt="Cover" />
                <div className="fb-overlay">
                  <div className="fb-profile-pic">
                    <Wrench size={20} color="white" />
                  </div>
                  <div className="fb-info">
                    <h4>Garage TRƯỜNG PHÁT</h4>
                    <p>1.2K followers</p>
                  </div>
                  <button className="btn-fb-like">
                    <span className="fb-icon">f</span> Like Page
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="footer-bottom-bar">
          <p>Copyright © 2024 GARA Ô TÔ TRƯỜNG PHÁT. Designed by Antigravity</p>
        </div>
      </footer>

      <style jsx>{`
        @media (max-width: 768px) {
          .menu-toggle {
            display: block !important;
          }
        }
      `}</style>

    </div>
  );
}
