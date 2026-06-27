'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  Wrench, 
  ShieldCheck, 
  Zap, 
  Calendar, 
  Clock, 
  Phone, 
  MapPin, 
  ChevronRight,
  Menu,
  X,
  Mail,
  Globe,
  Share2,
  MessageCircle,
  Send,
  Users
} from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';
import './landing.css';

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customer, setCustomer] = useState(null);
  const [occupancy, setOccupancy] = useState({});
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedHour, setSelectedHour] = useState(null);
  const [formData, setFormData] = useState({
    customerName: '',
    phoneNumber: '',
    licensePlate: '',
    serviceType: 'Bảo dưỡng định kỳ',
    note: ''
  });

  // Trợ lý ảo AI Chatbot State
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessages, setAiMessages] = useState([
    {
      role: 'assistant',
      content: 'Xin chào! Em là Trợ lý ảo Gara Trường Phát. Em có thể hỗ trợ chẩn đoán lỗi xe, tìm hiểu gói dịch vụ hoặc hướng dẫn anh/chị đặt lịch bảo dưỡng gầm máy, điện lạnh, đồng sơn... Anh/chị đang gặp vấn đề gì với xế yêu của mình ạ?',
      time: 'Vừa xong'
    }
  ]);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiMessages, isAiOpen]);

  const handleAiSend = async (textToSend) => {
    const text = textToSend || aiInput;
    if (!text || !text.trim()) return;

    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Thêm tin nhắn của User
    const userMsg = { role: 'user', content: text, time: currentTime };
    const updatedMsgs = [...aiMessages, userMsg];
    setAiMessages(updatedMsgs);
    setAiInput('');
    setAiLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMsgs })
      });

      const data = await response.json();
      const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (response.ok && data.reply) {
        setAiMessages(prev => [...prev, { role: 'assistant', content: data.reply, time: replyTime }]);
      } else {
        setAiMessages(prev => [...prev, { role: 'assistant', content: 'Dạ, hệ thống kết nối AI đang bận. Anh/chị có thể liên hệ hotline 0909 123 456 hoặc đặt lịch hẹn trực tiếp nhé!', time: replyTime }]);
      }
    } catch (error) {
      const errTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setAiMessages(prev => [...prev, { role: 'assistant', content: 'Dạ, không thể kết nối đến máy chủ AI. Xin quý khách vui lòng thử lại sau.', time: errTime }]);
    } finally {
      setAiLoading(false);
    }
  };

  const scrollToBooking = () => {
    setIsAiOpen(false);
    const bookingSection = document.getElementById('booking');
    if (bookingSection) {
      bookingSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const renderMessageContent = (content) => {
    const lines = content.split('\n');
    return lines.map((line, index) => {
      let trimmed = line.trim();
      const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('* ');
      if (isBullet) {
        const text = trimmed.substring(2);
        return (
          <ul key={index} style={{ margin: '4px 0', paddingLeft: '1.2rem', listStyleType: 'disc' }}>
            <li style={{ marginBottom: '2px' }}>{parseInlineMarkdown(text)}</li>
          </ul>
        );
      }
      return <p key={index} style={{ margin: '0 0 8px 0' }}>{parseInlineMarkdown(line)}</p>;
    });
  };

  const parseInlineMarkdown = (text) => {
    const boldRegex = /\*\*(.*?)\*\*/g;
    const parts = [];
    let match;
    let lastIndex = 0;
    
    while ((match = boldRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      parts.push(<strong key={match.index}>{match[1]}</strong>);
      lastIndex = boldRegex.lastIndex;
    }
    
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    
    return parts.length > 0 ? parts : text;
  };

  const AI_SUGGESTIONS = [
    'Xe bị kêu lạ ở gầm',
    'Đèn Check Engine sáng',
    'Bảo dưỡng định kỳ',
    'Đặt lịch hẹn thế nào?'
  ];

  const WORKING_HOURS = [8, 9, 10, 11, 13, 14, 15, 16, 17];

  useEffect(() => {
    // Kiểm tra xem khách hàng đã đăng nhập chưa
    fetch('/api/auth/customer/me')
      .then(res => res.json())
      .then(data => {
        if (data.customer) {
          setCustomer(data.customer);
          // Tự động điền form nếu đã có thông tin
          setFormData(prev => ({
            ...prev,
            customerName: data.customer.fullname || '',
            phoneNumber: data.customer.phone || '',
            licensePlate: data.customer.licensePlate || '',
          }));
        }
      })
      .catch(() => {});
  }, []);

  const fetchOccupancy = async (date) => {
    try {
      const response = await fetch(`/api/bookings?date=${date}`);
      const data = await response.json();
      if (data.occupancy) setOccupancy(data.occupancy);
    } catch (error) {
      console.error('Fetch occupancy error:', error);
    }
  };

  const handleDateChange = (e) => {
    const date = e.target.value;
    setSelectedDate(date);
    setSelectedHour(null);
    if (date) fetchOccupancy(date);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDate || selectedHour === null) {
      toast.error('Vui lòng chọn ngày và giờ hẹn');
      return;
    }

    const appointmentDate = new Date(selectedDate);
    appointmentDate.setHours(selectedHour, 0, 0, 0);

    if (appointmentDate.getTime() <= Date.now()) {
      toast.error('Không thể đặt lịch hẹn trong quá khứ. Vui lòng chọn khung giờ khác.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          appointmentDate: appointmentDate.toISOString()
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Đặt lịch thành công! Nhân viên sẽ liên hệ với bạn sớm.');
        setFormData({
          customerName: '',
          phoneNumber: '',
          licensePlate: '',
          serviceType: 'Bảo dưỡng định kỳ',
          note: ''
        });
        setSelectedDate('');
        setSelectedHour(null);
        setOccupancy({});
      } else {
        toast.error(data.error || 'Đã xảy ra lỗi');
      }
    } catch (error) {
      toast.error('Không thể kết nối đến máy chủ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="landing-body">
      <Toaster position="top-right" />
      
      {/* Navbar */}
      <nav className="navbar">
        <div className="logo">GARA TRƯỜNG PHÁT</div>
        
        <div className={`nav-links ${isMenuOpen ? 'active' : ''}`}>
          <a href="#home">Trang chủ</a>
          <a href="#services">Dịch vụ</a>
          <a href="#booking">Đặt lịch</a>
          <a href="#contact">Liên hệ</a>
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

        <button className="menu-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)} style={{ display: 'none', background: 'none', border: 'none', color: 'white' }}>
          {isMenuOpen ? <X /> : <Menu />}
        </button>
      </nav>

      {/* Hero Section */}
      <section id="home" className="hero">
        <div className="hero-container-wrapper">
          <div className="hero-content">
            <h1>Đẳng Cấp Bảo Dưỡng <br /> Xứng Tầm Xế Yêu</h1>
            <p>
              Gara Trường Phát mang đến giải pháp chăm sóc ô tô toàn diện {"\n"}
              với công nghệ hiện đại, đội ngũ kỹ thuật viên tay nghề cao {"\n"}
              và phụ tùng chính hãng.
            </p>
            <div className="cta-group">
              <a href="#booking" className="btn-lp btn-lp-primary">Đặt lịch ngay</a>
              <a href="#services" className="btn-lp btn-lp-outline">Khám phá dịch vụ</a>
            </div>
          </div>

          <div className="hero-orbit-stats">
            <div className="orbit-scene">
              {/* Outer Orbit Ring */}
              <div className="orbit-ring orbit-ring-outer">
                <div className="orbit-dot dot-1"></div>
              </div>
              
              {/* Middle Orbit Ring */}
              <div className="orbit-ring orbit-ring-middle">
                <div className="orbit-dot dot-2"></div>
              </div>

              {/* Inner Orbit Ring */}
              <div className="orbit-ring orbit-ring-inner">
                <div className="orbit-dot dot-3"></div>
              </div>

              {/* Central avatar */}
              <div className="orbit-center">
                <img 
                  src="/hero_orbit_car.png" 
                  alt="Gara Trường Phát Premium Car" 
                  className="orbit-center-img"
                />
                <div className="orbit-center-glow"></div>
              </div>

              {/* Floating badges */}
              {/* Badge 1: Top */}
              <div className="float-badge badge-top">
                <div className="badge-icon-box bg-blue">
                  <Wrench size={18} className="text-blue" />
                </div>
                <div className="badge-text-box">
                  <span className="badge-label">Kỹ thuật viên</span>
                  <span className="badge-value">30+ Chuyên gia</span>
                </div>
              </div>

              {/* Badge 2: Right */}
              <div className="float-badge badge-right">
                <div className="badge-icon-box bg-green">
                  <ShieldCheck size={18} className="text-green" />
                </div>
                <div className="badge-text-box">
                  <span className="badge-label">Khách hàng tin chọn</span>
                  <span className="badge-value">10.000+</span>
                </div>
              </div>

              {/* Badge 3: Left */}
              <div className="float-badge badge-left">
                <div className="badge-icon-box bg-cyan">
                  <Zap size={18} className="text-cyan" />
                </div>
                <div className="badge-text-box">
                  <span className="badge-label">Phụ tùng</span>
                  <span className="badge-value">100% Chính hãng</span>
                </div>
              </div>
            </div>

            {/* Bottom stats description */}
            <div className="orbit-bottom-text">
              <Users size={16} className="text-muted" />
              <span>Được hơn <strong>10.000+</strong> chủ xe tin dùng mỗi năm</span>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="section services-visual-section">
        <div className="section-title">
          <h2 className="premium-title">DỊCH VỤ CỦA TRƯỜNG PHÁT</h2>
          <p>Garage Ô Tô Trường Phát – Tận Tâm Sửa Chữa, Uy Tín Vượt Trội, Đồng Hành Trên Mọi Nẻo Đường</p>
        </div>

        <div className="services-visual-grid">
          {[
            { title: 'Bảo Dưỡng Khoang Động Cơ Ô tô', img: '/service-1.png' },
            { title: 'Bảo Dưỡng Định Kỳ', img: '/service-2.png' },
            { title: 'Sửa Chữa Máy Gầm', img: '/service-3.png' },
            { title: 'Sửa Chữa Điện Lạnh', img: '/service-4.png' },
            { title: 'Báo Giá Gói Bảo Dưỡng Cơ Bản', img: 'https://images.unsplash.com/photo-1530046339160-ce3e530c7d2f?auto=format&fit=crop&w=800&q=80' },
            { title: 'Dịch Vụ Sơn Dặm Vá Xe Ô Tô', img: 'https://images.unsplash.com/photo-1621359982464-325d7065969a?auto=format&fit=crop&w=800&q=80' },
            { title: 'Sửa Chữa - Phục Hồi Đồng Thân Xe Ô Tô', img: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=800&q=80' },
            { title: 'Chăm Sóc Ngoại Thất', img: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?q=80&w=800&auto=format&fit=crop' },
            { title: 'Chăm Sóc Khoang Máy', img: 'https://images.unsplash.com/photo-1502877338535-766e1452684a?q=80&w=800&auto=format&fit=crop' },
          ].map((service, index) => (
            <div key={index} className="service-visual-card">
              <div className="service-image-wrapper">
                <img 
                  src={service.img} 
                  alt={service.title} 
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=800&auto=format&fit=crop';
                  }}
                />
                <div className="service-title-overlay">
                  <span>{service.title}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="view-more-container">
          <Link href="/services" className="btn-lp btn-lp-primary btn-view-all">
            XEM TẤT CẢ
          </Link>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="section testimonials-section">
        <div className="section-title">
          <h2 className="premium-title">KHÁCH HÀNG NÓI GÌ VỀ CHÚNG TÔI</h2>
          <p>Garage Ô Tô Trường Phát – Tận Tâm Sửa Chữa, Uy Tín Vượt Trội, Đồng Hành Trên Mọi Nẻo Đường</p>
        </div>

        <div className="testimonials-grid">
          {[
            {
              name: 'ROSY YIN',
              date: '12/09/2025',
              content: 'Tôi đã sửa xe ở Garage Ô Tô Trường Phát 2-3 lần rồi, lần nào lấy xe cũng thấy đẹp và rất hài lòng. Chủ gara cũng rất dễ thương, giá thì hợp lý. Muốn xe đẹp thì cứ yên tâm mang qua đây.',
              avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop'
            },
            {
              name: 'HUYNH THANH HAP',
              date: '12/09/2021',
              content: 'Cảm ơn Garage Ô Tô Trường Phát! Rất nhiệt tình, chu đáo, phục vụ sửa chữa rất tốt, rất hài lòng và ưng ý. Từ khâu kiểm tra, thợ máy làm việc rất chuyên nghiệp, khiến mình cảm thấy rất ok.',
              avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop'
            },
            {
              name: 'THỊNH BS',
              date: '20/12/2024',
              content: 'Anh em rất có tâm, bắt lỗi xe chuẩn. Nhiều hôm anh em kiểm tra xe giùm nhưng vẫn nhiệt tình hỗ trợ lên cầu - xuống cầu. 5 sao cho chất lượng dịch vụ ở đây!',
              avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150&auto=format&fit=crop'
            }
          ].map((testimonial, index) => (
            <div key={index} className="testimonial-card">
              <div className="testimonial-avatar">
                <img src={testimonial.avatar} alt={testimonial.name} />
              </div>
              <div className="stars">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="star">★</span>
                ))}
              </div>
              <p className="testimonial-date">{testimonial.date} 04:40 PM • 1 Lượt xem</p>
              <p className="testimonial-content">&ldquo;{testimonial.content}&rdquo;</p>
              <h4 className="testimonial-author">KHÁCH HÀNG {testimonial.name} ĐÁNH GIÁ TRÊN GG MAPS...</h4>
            </div>
          ))}
        </div>
        
        <div className="carousel-dots">
          <span className="dot active"></span>
          <span className="dot"></span>
          <span className="dot"></span>
        </div>
      </section>

      {/* Achievements Section */}
      <section id="achievements" className="section achievements-section">
        <div className="achievements-overlay"></div>
        <div className="section-title" style={{ position: 'relative', zIndex: 2 }}>
          <h2 className="premium-title">THÀNH TỰU CỦA CHÚNG TÔI</h2>
        </div>

        <div className="achievements-grid">
          {[
            {
              title: 'Vô địch Victory Challenge 2024 | Hành trình chinh phục đỉnh cao',
              desc: 'Garage Trường Phát vừa ghi dấu ấn mạnh mẽ tại Victory Challenge Sailun Cup 2024 với giải thưởng cao quý Xe Thi Đấu Đẹp Nhất.',
              img: 'https://images.unsplash.com/photo-1578332039326-38435d038234?auto=format&fit=crop&w=800&q=80'
            },
            {
              title: 'Chiếc xe thắng giải – Đỉnh cao của sự sáng tạo và kỹ thuật',
              desc: 'Chiếc xe chiến thắng cuộc thi không chỉ gây ấn tượng bởi thiết kế mạnh mẽ, cá tính mà còn bởi những nâng cấp kỹ thuật vượt trội.',
              img: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=800&q=80'
            },
            {
              title: 'Giải đua xe địa hình Victory Challenge Sailun Cup 2024 Huế',
              desc: 'Sự kiện Victory Challenge Sailun Cup 2024 kết hợp ngày hội cắm trại xe 3 miền, một hành trình thử thách, hội tụ văn hóa đầy cảm xúc.',
              img: 'https://images.unsplash.com/photo-1541443131876-44b03de101c5?auto=format&fit=crop&w=800&q=80'
            },
            {
              title: 'Garage độ xe địa hình Hạng Chuyên Nghiệp tại Quận 7',
              desc: 'Garage Trường Phát tự hào là địa chỉ chuyên độ xe địa hình hạng nặng, nâng cấp full option, đảm bảo uy tín – chất lượng.',
              img: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80'
            }
          ].map((item, index) => (
            <div key={index} className="achievement-card">
              <div className="achievement-image-skewed">
                <img 
                  src={item.img} 
                  alt={item.title} 
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1542435503-956c469947f6?q=80&w=800&auto=format&fit=crop';
                  }}
                />
              </div>
              <div className="achievement-info">
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Technical Advice Section */}
      <section id="advice" className="section advice-section">
        <div className="section-title">
          <h2 className="premium-title">TƯ VẤN KỸ THUẬT</h2>
          <p>Garage Ô Tô Trường Phát – Tận Tâm Sửa Chữa, Uy Tín Vượt Trội, Đồng Hành Trên Mọi Nẻo Đường</p>
        </div>

        <div className="advice-grid">
          {[
            {
              title: 'KỸ THUẬT THIẾT KẾ XE ĐỊA HÌNH CHUYÊN NGHIỆP',
              date: '24/09/24',
              summary: 'Xe địa hình (off-road) luôn là niềm đam mê của những tín đồ yêu thích chinh phục thử thách. Tuy nhiên, để một chiếc xe có thể vượt qua địa hình hiểm trở...',
              img: 'https://images.unsplash.com/photo-1533130061792-64b345e4a833?q=80&w=800&auto=format&fit=crop'
            },
            {
              title: 'ĐỘ CỐP ĐIỆN Ô TÔ CHUYÊN NGHIỆP – NÂNG TẦM ĐẲNG CẤP',
              date: '24/09/24',
              summary: 'Trong thời đại xe hơi ngày càng hiện đại, độ cốp điện ô tô đang trở thành xu hướng nâng cấp được nhiều chủ xe lựa chọn. Cốp điện mang lại sự tiện lợi...',
              img: 'https://images.unsplash.com/photo-1621359982464-325d7065969a?q=80&w=800&auto=format&fit=crop'
            },
            {
              title: 'SỬA CHỮA ĐỘNG CƠ FORD RANGER HAO NHỚT, RA KHÓI',
              date: '24/09/24',
              summary: 'Ford Ranger là mẫu bán tải được ưa chuộng tại Việt Nam nhờ sức mạnh và khả năng vận hành linh hoạt. Tuy nhiên, sau thời gian sử dụng, nhiều xe thường gặp...',
              img: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?q=80&w=800&auto=format&fit=crop'
            }
          ].map((article, index) => (
            <div key={index} className="advice-card">
              <div className="advice-image">
                <img 
                  src={article.img} 
                  alt={article.title} 
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=800&auto=format&fit=crop';
                  }}
                />
              </div>
              <div className="advice-content">
                <h3 className="advice-card-title">{article.title}</h3>
                <p className="advice-date"><Clock size={14} style={{ marginRight: '5px' }} /> {article.date}</p>
                <p className="advice-summary">{article.summary}</p>
                <a href="#" className="read-more">Xem thêm</a>
              </div>
            </div>
          ))}
        </div>

        <div className="view-more-container">
          <button className="btn-lp btn-lp-primary btn-view-all">XEM TẤT CẢ</button>
        </div>
      </section>

      {/* Experience Sharing Section */}
      <section id="experience" className="section experience-section">
        <div className="section-title">
          <h2 className="premium-title">CHIA SẺ KINH NGHIỆM</h2>
          <p>Garage Ô Tô Trường Phát – Tận Tâm Sửa Chữa, Uy Tín Vượt Trội, Đồng Hành Trên Mọi Nẻo Đường</p>
        </div>

        <div className="experience-grid">
          {[
            {
              title: 'HỖ TRỢ CỨU XE BỊ HỎNG HÓC, TẮT MÁY GIỮA ĐƯỜNG',
              date: '11/09/25',
              summary: 'Trong quá trình sử dụng ô tô, không ít lần xe gặp sự cố bất ngờ như tắt máy giữa đường, chết máy không khởi động được, hỏng hóc nặng không thể di chuyển.',
              img: 'https://images.unsplash.com/photo-1597766333608-2889895cd67f?q=80&w=800&auto=format&fit=crop'
            },
            {
              title: 'KÍCH BÌNH ẮC QUY – CÂU BÌNH ẮC QUY TẠI TP.HCM',
              date: '11/09/25',
              summary: 'Ắc quy là "trái tim" cung cấp năng lượng để khởi động và vận hành các hệ thống điện trên ô tô. Tuy nhiên, sau thời gian sử dụng, bình ắc quy có thể bị yếu...',
              img: 'https://images.unsplash.com/photo-1620939511593-339ac0737107?q=80&w=800&auto=format&fit=crop'
            },
            {
              title: 'DỊCH VỤ CỨU HỘ Ô TÔ 24/7 NHANH CHÓNG',
              date: '24/09/24',
              summary: 'Bạn đang tìm dịch vụ cứu hộ ô tô 24/7 tại TP.HCM nhanh chóng và chuyên nghiệp? Hãy đến với Garage Trường Phát – địa chỉ uy tín hàng đầu được khách hàng tin tưởng.',
              img: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?q=80&w=800&auto=format&fit=crop'
            }
          ].map((item, index) => (
            <div key={index} className="experience-card">
              <div className="experience-image">
                <img 
                  src={item.img} 
                  alt={item.title} 
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=800&auto=format&fit=crop';
                  }}
                />
              </div>
              <div className="experience-content">
                <h3 className="experience-card-title">{item.title}</h3>
                <p className="experience-date"><Calendar size={14} style={{ marginRight: '5px' }} /> {item.date}</p>
                <p className="experience-summary">{item.summary}</p>
                <a href="#" className="read-more">Xem thêm</a>
              </div>
            </div>
          ))}
        </div>

        <div className="view-more-container">
          <button className="btn-lp btn-lp-primary btn-view-all">XEM TẤT CẢ</button>
        </div>
      </section>

      {/* Welcome Section */}
      <section id="welcome" className="section welcome-section">
        <div className="welcome-overlay"></div>
        <div className="welcome-container">
          <h2 className="welcome-title">CHÀO MỪNG BẠN ĐẾN VỚI GARAGE Ô TÔ TRƯỜNG PHÁT</h2>
          
          <div className="welcome-content">
            <p>
              <strong>Garage Ô Tô Trường Phát</strong> với tiêu chí hoạt động <strong>“TẬN TÂM – CHUYÊN NGHIỆP”</strong> cam kết mang đến cho khách hàng những trải nghiệm tuyệt vời và sự hài lòng trọn vẹn. 
              Đội ngũ kỹ thuật viên của chúng tôi có tay nghề cao, giàu kinh nghiệm, tinh thần trách nhiệm và luôn tận tâm, cẩn thận trong từng khâu xử lý trước khi bàn giao xe cho khách.
            </p>
            
            <p>
              Tại website chính thức này, Quý khách có thể tìm thấy đầy đủ thông tin về dịch vụ sửa chữa ô tô, bảo dưỡng định kỳ, đồng sơn, thay thế phụ tùng chính hãng cùng bảng giá minh bạch, chính sách bảo hành rõ ràng.
            </p>

            <h3 className="welcome-subtitle">Công nghệ hiện đại – Dịch vụ chuyên nghiệp</h3>
            
            <p>
              Garage Ô Tô Trường Phát luôn ứng dụng công nghệ kỹ thuật tiên tiến và trang thiết bị hiện đại bậc nhất, giúp quy trình chăm sóc và sửa chữa xe trở nên chính xác – nhanh chóng – tiết kiệm thời gian.
            </p>

            <ul className="welcome-list">
              <li>Phụ tùng chính hãng 100%, nguồn gốc rõ ràng, đa dạng mẫu mã.</li>
              <li>Chế độ bảo hành đúng tiêu chuẩn, minh bạch và uy tín.</li>
              <li>Giá cả hợp lý, cạnh tranh, xứng đáng với chất lượng dịch vụ.</li>
            </ul>

            <div className="welcome-cta-notes">
              <p>👉 Quý khách vui lòng đặt lịch hẹn trực tuyến để được phục vụ tốt nhất và cập nhật các chương trình ưu đãi mới nhất.</p>
              <p>⚠️ Lưu ý: Garage Ô Tô Trường Phát chỉ sử dụng hệ thống quản lý chính thức này để tiếp nhận và theo dõi lịch trình bảo dưỡng của Quý khách.</p>
            </div>

            <div className="welcome-footer-text">
              ✨ Garage Ô Tô Trường Phát: Tận tâm trong từng dịch vụ, chuyên nghiệp trong từng chi tiết!
            </div>

            <div className="welcome-btn-wrapper">
              <a href="#booking" className="btn-lp btn-lp-primary btn-welcome">ĐẶT LỊCH BẢO DƯỠNG HÔM NAY</a>
            </div>
          </div>
        </div>
      </section>

      {/* Booking Section */}
      <section id="booking" className="section booking-section">
        <div className="section-title">
          <h2>Đặt Lịch Hẹn</h2>
          <p>Tiết kiệm thời gian và chủ động hơn cho hành trình của bạn</p>
        </div>

        <div className="booking-container">
          {customer ? (
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group-lp">
                  <label>Họ và tên *</label>
                  <input 
                    type="text" 
                    name="customerName" 
                    value={formData.customerName || ''}
                    onChange={handleInputChange}
                    placeholder="Nguyễn Văn A" 
                    required 
                  />
                </div>
                <div className="form-group-lp">
                  <label>Số điện thoại *</label>
                  <input 
                    type="tel" 
                    name="phoneNumber" 
                    value={formData.phoneNumber || ''}
                    onChange={handleInputChange}
                    placeholder="09xx xxx xxx" 
                    required 
                  />
                </div>
                <div className="form-group-lp">
                  <label>Biển số xe *</label>
                  <input 
                    type="text" 
                    name="licensePlate" 
                    value={formData.licensePlate || ''}
                    onChange={handleInputChange}
                    placeholder="51G-123.45" 
                    required 
                  />
                </div>
                <div className="form-group-lp">
                  <label>Loại dịch vụ</label>
                  <select 
                    name="serviceType" 
                    value={formData.serviceType || ''}
                    onChange={handleInputChange}
                  >
                    <option>Bảo dưỡng định kỳ</option>
                    <option>Kiểm tra động cơ</option>
                    <option>Thay dầu/nhớt</option>
                    <option>Sửa chữa điện</option>
                    <option>Khác</option>
                  </select>
                </div>
                <div className="form-group-lp" style={{ gridColumn: 'span 2' }}>
                  <label>Ngày hẹn *</label>
                  <input 
                    type="date" 
                    name="selectedDate" 
                    value={selectedDate || ''}
                    onChange={handleDateChange}
                    min={new Date().toISOString().split('T')[0]}
                    required 
                  />
                </div>

                {selectedDate && (
                  <div className="form-group-lp" style={{ gridColumn: 'span 2' }}>
                    <label>Chọn khung giờ (Tối đa 10 xe/giờ) *</label>
                    <div className="slots-grid">
                      {WORKING_HOURS.map(hour => {
                        const count = occupancy[hour] || 0;
                        const isFull = count >= 10;
                        const isActive = selectedHour === hour;
                        
                        const d = new Date();
                        const localToday = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                        const currentHour = d.getHours();
                        const isToday = selectedDate === localToday;
                        const isPast = isToday && hour <= currentHour;
                        const isDisabled = isFull || isPast;
                        
                        return (
                          <div 
                            key={hour}
                            className={`slot-btn ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`}
                            onClick={() => !isDisabled && setSelectedHour(hour)}
                            style={isPast ? { opacity: 0.5, cursor: 'not-allowed', background: '#f1f5f9', color: '#94a3b8', border: '1px solid #cbd5e1' } : {}}
                          >
                            <span style={{ fontWeight: 600 }}>{hour}:00</span>
                            <span className="slot-count">{isPast ? 'Đã qua' : `${count}/10 xe`}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="form-group-lp" style={{ gridColumn: 'span 2' }}>
                  <label>Ghi chú thêm</label>
                  <textarea 
                    name="note" 
                    value={formData.note || ''}
                    onChange={handleInputChange}
                    rows="3" 
                    placeholder="Ví dụ: Xe bị kêu ở bánh trước..."
                  ></textarea>
                </div>
              </div>
              <button 
                type="submit" 
                className="btn-lp btn-lp-primary" 
                style={{ width: '100%', marginTop: '2rem' }}
                disabled={loading}
              >
                {loading ? 'Đang gửi...' : 'Xác nhận đặt lịch'}
              </button>
            </form>
          ) : (
            <div className="booking-login-required">
              <div className="login-required-icon pulse-animation">
                <Calendar size={36} />
              </div>
              <h3>Vui Lòng Đăng Nhập</h3>
              <p>Để đảm bảo tính bảo mật và lưu lại lịch sử bảo dưỡng xe, quý khách vui lòng đăng nhập hoặc đăng ký tài khoản trước khi đặt lịch.</p>
              <Link href="/customer/auth?redirect=/#booking" className="btn-lp btn-lp-primary btn-login-now">
                Đăng nhập / Đăng ký ngay
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Improved Footer */}
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

            <div className="social-links-simple">
              <div className="social-icon fb">f</div>
              <div className="social-icon gp">G+</div>
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

      {/* AI Chatbot Widget */}
      <div className="ai-chatbot-container">
        {/* Floating Bubble */}
        <div className="ai-chat-bubble" onClick={() => setIsAiOpen(!isAiOpen)}>
          <MessageCircle size={28} />
        </div>

        {/* Chat Window */}
        <div className={`ai-chat-window ${isAiOpen ? 'active' : ''}`}>
          <div className="ai-chat-header">
            <div className="ai-chat-title-info">
              <div className="ai-chat-avatar-status">
                <Wrench size={18} />
                <span className="ai-status-indicator"></span>
              </div>
              <div>
                <h3>Trợ Lý Ảo Trường Phát</h3>
                <p>Đang trực tuyến • Sẵn sàng tư vấn</p>
              </div>
            </div>
            <button className="ai-chat-close-btn" onClick={() => setIsAiOpen(false)}>
              <X size={20} />
            </button>
          </div>

          {/* Messages Container */}
          <div className="ai-chat-messages-container">
            {aiMessages.map((msg, index) => (
              <div key={index} className={`ai-msg-wrapper ${msg.role}`}>
                <div className="ai-msg-bubble">
                  {renderMessageContent(msg.content)}
                  {msg.role === 'assistant' && (msg.content.toLowerCase().includes('đặt lịch') || msg.content.toLowerCase().includes('lịch hẹn')) && (
                    <button className="ai-book-now-btn" onClick={scrollToBooking}>
                      <Calendar size={14} style={{ marginRight: '6px' }} /> Đặt lịch ngay
                    </button>
                  )}
                </div>
                <span className="ai-msg-time">
                  {msg.time || 'Vừa xong'}
                </span>
              </div>
            ))}
            {aiLoading && (
              <div className="ai-msg-wrapper assistant">
                <div className="ai-msg-bubble">
                  <div className="ai-typing-loader">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions */}
          <div className="ai-chat-suggestions">
            {AI_SUGGESTIONS.map((sug, i) => (
              <button 
                key={i} 
                className="ai-suggestion-chip"
                onClick={() => handleAiSend(sug)}
                disabled={aiLoading}
              >
                {sug}
              </button>
            ))}
          </div>

          {/* Input Area */}
          <div className="ai-chat-input-area">
            <input 
              type="text" 
              className="ai-chat-input"
              placeholder="Nhập triệu chứng xe..."
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAiSend()}
              disabled={aiLoading}
            />
            <button 
              className="ai-chat-send-btn"
              onClick={() => handleAiSend()}
              disabled={aiLoading || !aiInput.trim()}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>

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
